import base64
import json
import shutil
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import requests
from playwright.sync_api import sync_playwright


# ============================================================
# CONFIG
# ============================================================

AUTH_URL = (
    "https://auth.riotgames.com/authorize"
    "?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in"
    "&client_id=play-valorant-web-prod"
    "&response_type=token%20id_token"
    "&nonce=1"
    "&scope=account%20openid"
)

ENTITLEMENTS_URL = (
    "https://entitlements.auth.riotgames.com/api/token/v1"
)

GEO_URL = (
    "https://riot-geo.pas.si.riotgames.com"
    "/pas/v1/product/valorant"
)

VERSION_URL = "https://valorant-api.com/v1/version"

SKINS_URL = (
    "https://valorant-api.com/v1/weapons/skinlevels"
)

# Pasta com cookies/sessão da Riot.
# NÃO subir para o Git.
PROFILE_DIR = ".riot-browser-profile"

# O cookie de sessão da Riot (ssid) é um session cookie:
# o Chrome descarta ao fechar. Guardamos à parte e
# reinjetamos na próxima execução.
#
# Este arquivo dá acesso à conta. Permissão 600, fora do Git.
SESSION_FILE = ".riot-session.json"

SESSION_MAX_AGE = 30 * 24 * 3600


# Valor usado pelo cliente VALORANT.
PLATFORM_DATA = {
    "platformType": "PC",
    "platformOS": "Windows",
    "platformOSVersion": "10.0.19044.1.256.64bit",
    "platformChipset": "Unknown",
}

PLATFORM = base64.b64encode(
    json.dumps(
        PLATFORM_DATA,
        separators=(",", ":"),
    ).encode()
).decode()


# ============================================================
# HELPERS
# ============================================================

def find_browser():
    """
    Procura um Chrome/Chromium instalado no sistema.

    Usamos o navegador do sistema para evitar o problema de
    certificado que você teve com o Chromium do Playwright.
    """

    candidates = [
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "brave-browser",
    ]

    for name in candidates:
        path = shutil.which(name)

        if path:
            return path

    raise RuntimeError(
        "Chrome/Chromium não encontrado.\n\n"
        "Instale um navegador, por exemplo:\n"
        "sudo apt install chromium"
    )


def decode_jwt_payload(token):
    """
    Decodifica SOMENTE o payload do JWT.

    Não estamos validando assinatura aqui porque queremos
    somente obter o PUUID ("sub") do token emitido pela Riot.
    """

    parts = token.split(".")

    if len(parts) < 2:
        raise RuntimeError("Access token não parece ser um JWT válido.")

    payload = parts[1]

    # Corrige padding do Base64.
    payload += "=" * (-len(payload) % 4)

    decoded = base64.urlsafe_b64decode(payload)

    return json.loads(decoded.decode())


# ============================================================
# RIOT AUTH
# ============================================================

def save_session(context):
    """
    Salva os cookies, dando validade aos que são de sessão.

    O servidor valida o valor do cookie, não a flag local,
    então reapresentá-lo com expiração funciona.
    """

    cookies = context.cookies()

    deadline = time.time() + SESSION_MAX_AGE

    for cookie in cookies:
        expires = cookie.get("expires", -1)

        if expires is None or expires <= 0:
            cookie["expires"] = deadline

    path = Path(SESSION_FILE)

    path.write_text(
        json.dumps(cookies)
    )

    path.chmod(0o600)

    print(f"[+] Sessão salva ({len(cookies)} cookies).")


def load_session(context):
    path = Path(SESSION_FILE)

    if not path.exists():
        return

    try:
        cookies = json.loads(
            path.read_text()
        )

        context.add_cookies(cookies)

    except Exception as error:
        print(f"[!] Sessão salva inválida, ignorando: {error}")

        return

    print(f"[*] Sessão restaurada ({len(cookies)} cookies).")


def riot_login():
    browser_path = find_browser()

    print()
    print("=" * 60)
    print("LOGIN RIOT")
    print("=" * 60)

    print(f"[*] Navegador: {browser_path}")
    print(f"[*] Usando sessão salva em {PROFILE_DIR}")

    print("[*] Faça login normalmente na janela.")
    print("[*] Se pedir MFA, coloque o código.")
    print()

    final_url = None

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,

            headless=False,
            executable_path=browser_path,

            # SOMENTE PARA NOSSO TESTE LOCAL
            ignore_https_errors=True,

            # None = usa o tamanho real da janela, sem
            # recortar a página num viewport fixo.
            no_viewport=True,

            args=[
                "--disable-blink-features=AutomationControlled",
                "--start-maximized",
            ],
        )

        load_session(context)

        if context.pages:
            page = context.pages[0]
        else:
            page = context.new_page()

        try:
            page.goto(
                AUTH_URL,
                wait_until="domcontentloaded",
                timeout=60_000,
            )

            print("[*] Página carregada.")

            print("[*] Aguardando autenticação...")

            deadline = time.time() + 600

            while time.time() < deadline:
                current_url = page.url

                parsed = urlparse(current_url)

                # Aceita:
                #
                # /opt_in
                # /pt-br/opt_in
                # /en-us/opt_in
                # etc.
                #
                # O 404 da página não importa:
                # queremos apenas o fragmento contendo o token.
                if (
                    parsed.hostname == "playvalorant.com"
                    and parsed.path.rstrip("/").endswith("/opt_in")
                    and "access_token=" in parsed.fragment
                ):
                    final_url = current_url

                    print()
                    print("[+] Redirect de autenticação capturado!")

                    break

                page.wait_for_timeout(250)

        except Exception as error:
            raise RuntimeError(
                "Erro durante autenticação:\n"
                f"{error}"
            )

        finally:
            try:
                save_session(context)

            except Exception as error:
                print(f"[!] Não consegui salvar a sessão: {error}")

            context.close()

    if not final_url:
        raise RuntimeError(
            "Login não terminou ou o redirect "
            "não foi capturado."
        )

    fragment = urlparse(final_url).fragment

    params = parse_qs(fragment)

    access_token = params.get(
        "access_token",
        [None],
    )[0]

    id_token = params.get(
        "id_token",
        [None],
    )[0]

    if not access_token:
        raise RuntimeError(
            "Redirect capturado, mas não encontrei access_token."
        )

    if not id_token:
        raise RuntimeError(
            "Redirect capturado, mas não encontrei id_token."
        )

    print("[+] Access token capturado.")
    print("[+] ID token capturado.")
    print("[+] Login concluído!")

    return access_token, id_token


# ============================================================
# RIOT API
# ============================================================

def get_entitlement(access_token):
    print("[*] Obtendo entitlement token...")

    response = requests.post(
        ENTITLEMENTS_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        timeout=20,
    )

    if not response.ok:
        raise RuntimeError(
            "Falha obtendo entitlement token.\n"
            f"HTTP {response.status_code}\n"
            f"{response.text[:1000]}"
        )

    data = response.json()

    token = data.get("entitlements_token")

    if not token:
        raise RuntimeError(
            "A Riot respondeu, mas não retornou "
            "entitlements_token."
        )

    print("[+] Entitlement obtido.")

    return token


def get_region(access_token, id_token):
    print("[*] Descobrindo região da conta...")

    response = requests.put(
        GEO_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json={
            "id_token": id_token,
        },
        timeout=20,
    )

    if not response.ok:
        raise RuntimeError(
            "Falha descobrindo região.\n"
            f"HTTP {response.status_code}\n"
            f"{response.text[:1000]}"
        )

    data = response.json()

    affinities = data.get("affinities", {})

    region = affinities.get("live")

    if not region:
        raise RuntimeError(
            f"Região não encontrada na resposta:\n{data}"
        )

    print(f"[+] Região: {region}")

    return region


def region_to_shard(region):
    """
    A Riot separa region e shard.

    BR e LATAM ficam no shard NA.
    """

    mapping = {
        "br": "na",
        "latam": "na",
        "na": "na",
        "eu": "eu",
        "ap": "ap",
        "kr": "kr",
    }

    shard = mapping.get(region)

    if not shard:
        raise RuntimeError(
            f"Não sei qual shard usar para região '{region}'."
        )

    print(f"[+] Shard: {shard}")

    return shard


# ============================================================
# VALORANT VERSION
# ============================================================

def get_client_version():
    print("[*] Obtendo versão atual do VALORANT...")

    response = requests.get(
        VERSION_URL,
        timeout=20,
    )

    if not response.ok:
        raise RuntimeError(
            "Não consegui obter a versão do VALORANT.\n"
            f"HTTP {response.status_code}"
        )

    result = response.json()

    data = result.get("data")

    if not data:
        raise RuntimeError(
            "Resposta inesperada do valorant-api.com."
        )

    # Atualmente o campo mais útil.
    version = data.get("riotClientVersion")

    if not version:
        version = data.get("clientVersion")

    if not version:
        raise RuntimeError(
            "Não encontrei riotClientVersion/clientVersion."
        )

    print(f"[+] Client version: {version}")

    return version


# ============================================================
# STOREFRONT
# ============================================================

def get_store(
    access_token,
    entitlement,
    puuid,
    shard,
    client_version,
):
    print("[*] Buscando loja...")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Riot-Entitlements-JWT": entitlement,
        "X-Riot-ClientPlatform": PLATFORM,
        "X-Riot-ClientVersion": client_version,

        # IMPORTANTE
        "User-Agent": (
            "ShooterGame/13 "
            "Windows/10.0.19044.1.256.64bit"
        ),

        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    base = f"https://pd.{shard}.a.pvp.net/store"

    # A Riot trocou o storefront de GET v2 para POST v3.
    # Tentamos v3 primeiro e caímos no v2 se o shard
    # ainda estiver no formato antigo.
    attempts = [
        ("POST", f"{base}/v3/storefront/{puuid}", {}),
        ("GET", f"{base}/v2/storefront/{puuid}", None),
    ]

    print(f"[*] Client version: {client_version}")

    last_response = None

    for method, url, body in attempts:
        print(f"[*] {method} {url}")

        response = requests.request(
            method,
            url,
            headers=headers,
            json=body,
            timeout=20,
        )

        print(f"[*] HTTP {response.status_code}")

        if response.ok:
            print("[+] LOJA RECEBIDA!")

            return response.json()

        last_response = response

        if response.status_code != 404:
            break

    response = last_response

    print()
    print("[!] Headers da resposta:")
    for key, value in response.headers.items():
        print(f"    {key}: {value}")

    print()
    print("[!] Body:")
    print(
        response.text[:2000]
        if response.text
        else "<vazio>"
    )

    raise RuntimeError(
        f"Storefront retornou HTTP "
        f"{response.status_code}."
    )


# ============================================================
# SKINS
# ============================================================

def get_skin_database():
    print("[*] Baixando informações das skins...")

    response = requests.get(
        SKINS_URL,
        timeout=20,
    )

    if not response.ok:
        print(
            "[!] Não consegui baixar nomes/imagens "
            "das skins."
        )

        return {}

    data = response.json().get(
        "data",
        [],
    )

    database = {}

    for skin in data:
        uuid = skin.get("uuid")

        if uuid:
            database[uuid.lower()] = skin

    print(
        f"[+] {len(database)} níveis de skins carregados."
    )

    return database


# ============================================================
# DISPLAY
# ============================================================

def find_skin_for_offer(
    offer,
    skin_database,
):
    offer_id = (
        offer
        .get("OfferID", "")
        .lower()
    )

    # Normalmente OfferID corresponde ao skin level UUID.
    skin = skin_database.get(offer_id)

    if skin:
        return skin

    # Fallback usando Rewards.
    for reward in offer.get(
        "Rewards",
        [],
    ):
        item_id = (
            reward
            .get("ItemID", "")
            .lower()
        )

        skin = skin_database.get(item_id)

        if skin:
            return skin

    return None


def get_offer_price(offer):
    costs = offer.get(
        "Cost",
        {},
    )

    if not costs:
        return None

    # Para ofertas normais da loja existe normalmente
    # apenas a moeda VP.
    return next(iter(costs.values()))


def format_remaining_time(seconds):
    if seconds is None:
        return "desconhecido"

    hours = seconds // 3600

    minutes = (
        seconds % 3600
    ) // 60

    return f"{hours}h {minutes}min"


def print_store(store):
    panel = store.get(
        "SkinsPanelLayout"
    )

    if not panel:
        print()
        print(
            "[!] Não encontrei SkinsPanelLayout "
            "na resposta."
        )

        print()
        print("Resposta recebida:")

        print(
            json.dumps(
                store,
                indent=2,
            )[:5000]
        )

        return

    offers = panel.get(
        "SingleItemStoreOffers",
        [],
    )

    skin_database = get_skin_database()

    print()
    print()
    print("=" * 64)
    print("                   SUA LOJA DO VALORANT")
    print("=" * 64)
    print()

    if not offers:
        print("Nenhuma oferta encontrada.")

    for index, offer in enumerate(
        offers,
        start=1,
    ):
        skin = find_skin_for_offer(
            offer,
            skin_database,
        )

        if skin:
            name = skin.get(
                "displayName",
                "Skin desconhecida",
            )

            image = skin.get(
                "displayIcon"
            )

        else:
            name = (
                "Skin desconhecida "
                f"({offer.get('OfferID')})"
            )

            image = None

        price = get_offer_price(
            offer
        )

        print(f"{index}. {name}")

        if price is not None:
            print(f"   Preço: {price} VP")
        else:
            print("   Preço: desconhecido")

        if image:
            print(f"   Imagem: {image}")

        print()

    remaining = panel.get(
        "SingleItemOffersRemainingDurationInSeconds"
    )

    print("-" * 64)

    print(
        "Loja renova em: "
        f"{format_remaining_time(remaining)}"
    )

    print("=" * 64)


# ============================================================
# MAIN
# ============================================================

def main():
    print()
    print("=" * 60)
    print("VALORANT SHOP TEST")
    print("=" * 60)

    # 1. Login
    access_token, id_token = riot_login()

    # 2. PUUID
    payload = decode_jwt_payload(
        access_token
    )

    puuid = payload.get("sub")

    if not puuid:
        raise RuntimeError(
            "Não encontrei PUUID no access token."
        )

    print("[+] PUUID encontrado.")

    # Não imprimimos tokens ou PUUID completo.
    print(
        f"[*] Conta: {puuid[:8]}..."
    )

    # 3. Entitlement
    entitlement = get_entitlement(
        access_token
    )

    # 4. Região
    region = get_region(
        access_token,
        id_token,
    )

    # 5. Shard
    shard = region_to_shard(
        region
    )

    # 6. Versão
    client_version = (
        get_client_version()
    )

    # 7. Loja
    store = get_store(
        access_token=access_token,
        entitlement=entitlement,
        puuid=puuid,
        shard=shard,
        client_version=client_version,
    )

    # 8. Mostrar
    print_store(store)


if __name__ == "__main__":
    try:
        main()

    except KeyboardInterrupt:
        print()
        print("[!] Cancelado.")

    except requests.exceptions.SSLError as error:
        print()
        print("=" * 60)
        print("[ERRO SSL]")
        print("=" * 60)
        print()
        print(error)
        print()
        print(
            "Seu sistema não está confiando no certificado HTTPS."
        )
        print()
        print("Tente:")
        print()
        print(
            "sudo apt install --reinstall ca-certificates libnss3"
        )
        print("sudo update-ca-certificates")

    except requests.exceptions.ConnectionError as error:
        print()
        print("[ERRO DE CONEXÃO]")
        print(error)

    except Exception as error:
        print()
        print("=" * 60)
        print("[ERRO]")
        print("=" * 60)
        print()
        print(error)
