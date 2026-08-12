# Coolify MCP Server — Kurulum ve Yapılandırma Rehberi

Bu rehber, **Coolify MCP Server**'ı sıfırdan kurmanız, yapılandırmanız ve AI ajanlarınıza (OpenCode, Claude, Cursor vb.) bağlamanız için adım adım talimatlar içerir.

> **Hedef Kitle:** DevOps mühendisleri ve Coolify altyapısını AI ajanlarıyla yönetmek isteyen geliştiriciler.
> **Son Güncelleme:** v1.0.0

---

## İçindekiler

1. [Ön Koşullar](#1-ön-koşullar)
2. [Kurulum](#2-kurulum)
3. [Yapılandırma (.env)](#3-yapılandırma-env)
4. [Çalıştırma](#4-çalıştırma)
5. [OpenCode Entegrasyonu](#5-opencode-entegrasyonu)
6. [Docker ile Kurulum](#6-docker-ile-kurulum)
7. [Doğrulama](#7-doğrulama)
8. [Kullanım Örnekleri](#8-kullanım-örnekleri)
9. [Güvenlik Tavsiyeleri](#9-güvenlik-tavsiyeleri)
10. [Sorun Giderme](#10-sorun-giderme)

---

## 1. Ön Koşullar

| Gereksinim | Açıklama |
|-----------|----------|
| **Node.js >= 18** | Proje `tsup` ile ESM formatında derlenir. Node 18+ gereklidir. |
| **Coolify Instance** | Çalışan bir Coolify sunucusu (örn. `https://coolify.ornek.com`). |
| **Coolify API Token** | Coolify UI'den alınmış en az bir API token. Token'ın ilgili scope'lara sahip olması gerekir. |

### Coolify API Token'ı Alma

1. Coolify yönetim paneline giriş yapın.
2. Sağ üst köşedeki profil resminize tıklayın → **Credentials** → **API Tokens**.
3. **Create Token** butonuna tıklayın.
4. Token'a bir isim verin (örn. `mcp-read`) ve gerekli scope'ları seçin:
   - Okuma işlemleri için: `view:projects`, `view:resources`, `view:deployments`
   - Hassas veri okuma için: `view:envs`, `view:logs`
   - Deploy işlemleri için: `deploy:applications`
   - Yazma işlemleri için: `edit:envs`, `operate:applications`
5. **Save** ile token'ı oluşturun ve güvenli bir yere kopyalayın.

> **İpucu:** En az-ayrıcalık (least-privilege) için her işlem türüne ayrı token oluşturup kapsamlı token'lar kullanın. Ayrıntılar için [Güvenlik Tavsiyeleri](#9-güvenlik-tavsiyeleri) bölümüne bakın.

---

## 2. Kurulum

```bash
# 1. Depoyu klonla
git clone https://github.com/<org>/mcp-coolify.git
cd mcp-coolify

# 2. Bağımlılıkları yükle
npm install

# 3. TypeScript'i derle (tsup ile ESM formatında dist/ klasörüne)
npm run build

# 4. Çevre değişkenleri şablonunu kopyala
cp .env.example .env

# 5. .env dosyasını düzenle (bir sonraki bölüme bak)
# vi .env
```

Kurulum tamamlandığında `dist/index.js` dosyası oluşmuş olmalıdır:

```bash
ls -la dist/index.js
# -rw-r--r--  ...  dist/index.js
```

---

## 3. Yapılandırma (.env)

Tüm yapılandırma çevre değişkenleri (environment variables) ile yapılır. Değişkenler `src/config/schema.ts` içinde **Zod** şeması ile doğrulanır.

### 3.1. Zorunlu Değişkenler

| Değişken | Tip | Varsayılan | Açıklama |
|----------|-----|-----------|----------|
| `COOLIFY_URL` | `string` (URL) | — | Coolify instance'ının temel URL'si. Sonda `/` olmamalıdır (otomatik temizlenir). |

```bash
COOLIFY_URL=https://coolify.ornek.com
```

### 3.2. API Token'ları (en az biri zorunlu)

| Değişken | Tip | Varsayılan | Açıklama |
|----------|-----|-----------|----------|
| `COOLIFY_API_TOKEN` | `string` | — | **Fallback token.** Kapsamlı token'lar tanımlanmadığında kullanılır. |
| `COOLIFY_READ_TOKEN` | `string` | — | Salt okunur işlemler için token (listeleme, getirme). |
| `COOLIFY_SENSITIVE_TOKEN` | `string` | — | Hassas veri okuma (env değişkenleri, loglar) için token. |
| `COOLIFY_WRITE_TOKEN` | `string` | — | Yazma işlemleri (env değişkeni ekleme/düzenleme) için token. |
| `COOLIFY_DEPLOY_TOKEN` | `string` | — | Deploy/start/restart işlemleri için token. |

> **Önemli:** Kapsamlı token'lar (`COOLIFY_READ_TOKEN` vb.) tanımlandığında, `COOLIFY_API_TOKEN` override edilir. Sunucu her işlem için en düşük yetkili token'ı otomatik seçer. Örneğin `COOLIFY_READ_TOKEN` varsa, projeleri listeleme işleminde bu token kullanılır, ana token asla kullanılmaz.

### 3.3. Taşıma (Transport) Ayarları

| Değişken | Tip | Varsayılan | Açıklama |
|----------|-----|-----------|----------|
| `MCP_TRANSPORT` | `"stdio"` \| `"http"` | `"stdio"` | MCP taşıma modu. Local kullanım için `stdio`, remote için `http`. |
| `MCP_HTTP_HOST` | `string` | `"0.0.0.0"` | HTTP sunucu host adresi (yalnızca `MCP_TRANSPORT=http` iken kullanılır). |
| `MCP_HTTP_PORT` | `number` (1–65535) | `3000` | HTTP sunucu port numarası. |
| `MCP_SERVER_API_KEY` | `string` | — | HTTP MCP isteklerini doğrulamak için API anahtarı. **HTTP modunda zorunludur.** |

### 3.4. İşletim Modu

| Değişken | Tip | Varsayılan | Açıklama |
|----------|-----|-----------|----------|
| `COOLIFY_OPERATION_MODE` | `"read-only"` \| `"deploy-only"` \| `"safe-write"` | `"read-only"` | Sunucunun hangi işlemlere izin vereceğini belirler. |

- **`read-only`** (varsayılan): Yalnızca 10 okuma aracı çalışır. Tüm mutasyon araçları reddedilir.
- **`deploy-only`**: Okuma + deploy/restart/start işlemlerine izin verir. Stop ve env yazma işlemleri reddedilir.
- **`safe-write`**: Tüm okuma ve deploy işlemleri + `COOLIFY_ALLOW_STOP=true` ile stop, `COOLIFY_ALLOW_ENV_WRITE=true` ile env yazma.

### 3.5. Allowlist (Opsiyonel)

Erişimi belirli kaynaklarla kısıtlamak için virgülle ayrılmış UUID listeleri:

| Değişken | Tip | Açıklama |
|----------|-----|----------|
| `COOLIFY_ALLOWED_PROJECT_UUIDS` | `string` (virgülle ayrılmış UUID) | Sadece belirtilen projelere erişime izin ver. |
| `COOLIFY_ALLOWED_ENVIRONMENT_UUIDS` | `string` (virgülle ayrılmış UUID) | Sadece belirtilen ortamlara erişime izin ver. |
| `COOLIFY_ALLOWED_RESOURCE_UUIDS` | `string` (virgülle ayrılmış UUID) | Sadece belirtilen kaynaklara erişime izin ver. |

```bash
COOLIFY_ALLOWED_PROJECT_UUIDS=abc12345-...,def67890-...
COOLIFY_ALLOWED_RESOURCE_UUIDS=xyz11111-...
```

### 3.6. Production Koruma

| Değişken | Tip | Varsayılan | Açıklama |
|----------|-----|-----------|----------|
| `COOLIFY_PRODUCTION_ENV_NAMES` | `string` (virgülle ayrılmış) | `"production,prod"` | "Production" kabul edilen ortam isimleri. |
| `COOLIFY_DENY_PRODUCTION_MUTATIONS` | `"true"` \| `"false"` | `"true"` | Production ortamlarında tüm mutasyonları engelle. |
| `COOLIFY_ALLOW_PRODUCTION_DEPLOY` | `"true"` \| `"false"` | `"false"` | Production'a deploy'a izin ver (yalnızca `DENY_PRODUCTION_MUTATIONS=false` ise). |
| `COOLIFY_ALLOW_STOP` | `"true"` \| `"false"` | `"false"` | Stop işlemlerine global izin. |
| `COOLIFY_ALLOW_ENV_WRITE` | `"true"` \| `"false"` | `"false"` | Environment değişkeni değişikliklerine izin. |

### 3.7. Loglama

| Değişken | Tip | Varsayılan | Açıklama |
|----------|-----|-----------|----------|
| `COOLIFY_LOG_MAX_LINES` | `number` (1–1000) | `200` | Uygulama loglarından döndürülecek maksimum satır sayısı. |

### 3.8. Örnek `.env` Dosyası

```bash
# ─── Zorunlu ────────────────────────────────────────────────────
COOLIFY_URL=https://coolify.ornek.com
COOLIFY_API_TOKEN=cof_token_ornek-api-token-buraya-gelir

# ─── Transport ──────────────────────────────────────────────────
# "stdio" (varsayılan) veya "http"
MCP_TRANSPORT=stdio
# MCP_HTTP_HOST=0.0.0.0
# MCP_HTTP_PORT=3000
# MCP_SERVER_API_KEY=

# ─── İşletim Modu ──────────────────────────────────────────────
COOLIFY_OPERATION_MODE=read-only

# ─── Production Koruma ─────────────────────────────────────────
COOLIFY_PRODUCTION_ENV_NAMES=production,prod
COOLIFY_DENY_PRODUCTION_MUTATIONS=true
COOLIFY_ALLOW_PRODUCTION_DEPLOY=false
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false

# ─── Loglama ───────────────────────────────────────────────────
COOLIFY_LOG_MAX_LINES=200
```

> **Not:** `COOLIFY_API_TOKEN` değeri `cof_` ön ekiyle başlar (Coolify tarafından üretilen token formatı). Gerçek token'ınızı Coolify yönetim panelinden alın.

---

## 4. Çalıştırma

### 4.1. Local (stdio) — Varsayılan Mod

```bash
# .env dosyasından değişkenleri okuyarak çalıştır
MCP_TRANSPORT=stdio npm start

# Ya da .env zaten yapılandırıldıysa doğrudan:
npm start
```

Sunucu başladığında herhangi bir port dinlemez — **stdin/stdout** üzerinden MCP protokolü ile iletişim kurar. Bu mod, OpenCode gibi AI araçlarına local olarak bağlanmak için idealdir.

### 4.2. Remote (HTTP) — Sunucu Modu

```bash
MCP_TRANSPORT=http \
  MCP_HTTP_PORT=3000 \
  MCP_SERVER_API_KEY=guclu-bir-api-anahtari \
  npm start
```

Bu modda sunucu, HTTP + SSE (Server-Sent Events) üzerinden MCP isteklerini kabul eder.

**HTTP Endpoint'leri:**

| Endpoint | Auth Gerekli | Amaç |
|----------|-------------|------|
| `GET /healthz` | Hayır | Canlılık kontrolü — `{"ok":true,"status":"alive"}` döndürür. |
| `GET /readyz` | Hayır | Hazır olma kontrolü — Coolify API'ye erişimi doğrular. |
| `POST /mcp` | Evet (Bearer) | Tüm MCP araç çağrıları bu endpoint'e gider. |

```bash
# Sağlık kontrolü
curl http://localhost:3000/healthz
# {"ok":true,"status":"alive"}

# Hazır olma kontrolü (Coolify bağlantısını test eder)
curl http://localhost:3000/readyz
# {"ok":true,"coolifyUrl":"https://coolify.ornek.com","authStatus":"authenticated"}
```

> **Uyarı:** Production'da HTTP modunu her zaman bir reverse proxy (Nginx, Caddy) arkasında ve HTTPS ile kullanın.

---

## 5. OpenCode Entegrasyonu

### 5.1. Local (stdio) Bağlantı

`examples/opencode.local.jsonc` dosyasının içeriği:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "coolify": {
      "type": "local",
      "command": ["node", "/path/to/coolify-mcp/dist/index.mjs"],
      "environment": {
        // ─── Zorunlu ────────────────────────────────────────
        "COOLIFY_URL": "https://coolify.ornek.com",
        "COOLIFY_API_TOKEN": "{env:COOLIFY_API_TOKEN}",

        // ─── İsteğe Bağlı: Kapsamlı Token'lar ──────────────
        // COOLIFY_API_TOKEN yerine en az yetkili token'lar
        // "COOLIFY_READ_TOKEN": "{env:COOLIFY_READ_TOKEN}",
        // "COOLIFY_SENSITIVE_TOKEN": "{env:COOLIFY_SENSITIVE_TOKEN}",
        // "COOLIFY_WRITE_TOKEN": "{env:COOLIFY_WRITE_TOKEN}",
        // "COOLIFY_DEPLOY_TOKEN": "{env:COOLIFY_DEPLOY_TOKEN}",

        // ─── İşletim Modu ──────────────────────────────────
        "COOLIFY_OPERATION_MODE": "read-only",

        // ─── Allowlist (Opsiyonel) ──────────────────────────
        // Virgülle ayrılmış UUID listeleri
        // "COOLIFY_ALLOWED_PROJECT_UUIDS": "uuid1,uuid2",
        // "COOLIFY_ALLOWED_ENVIRONMENT_UUIDS": "uuid1,uuid2",
        // "COOLIFY_ALLOWED_RESOURCE_UUIDS": "uuid1,uuid2",

        // ─── Production Koruması (Opsiyonel) ────────────────
        // "COOLIFY_PRODUCTION_ENV_NAMES": "production,prod",
        // "COOLIFY_DENY_PRODUCTION_MUTATIONS": "true",
        // "COOLIFY_ALLOW_PRODUCTION_DEPLOY": "false",
        // "COOLIFY_ALLOW_STOP": "false",
        // "COOLIFY_ALLOW_ENV_WRITE": "false",

        // ─── Loglama ────────────────────────────────────────
        // "COOLIFY_LOG_MAX_LINES": "200",
        // "LOG_LEVEL": "info"
      }
    }
  }
}
```

**OpenCode'de Aktifleştirme:**

1. Yukarıdaki yapılandırmayı `opencode.local.jsonc` dosyanıza ekleyin.
2. `{env:COOLIFY_API_TOKEN}` referansı için token'ı shell ortam değişkeni olarak tanımlayın:
   ```bash
   export COOLIFY_API_TOKEN=cof_token_...
   ```
3. OpenCode'i yeniden başlatın. `MCP Servers` listesinde `coolify` adıyla görünmelidir.

### 5.2. Remote (HTTP) Bağlantı

`examples/opencode.remote.jsonc` dosyasının içeriği:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "coolify-remote": {
      "type": "remote",
      "url": "https://coolify-mcp.ornek.com/mcp",
      "headers": {
        "Authorization": "Bearer {env:MCP_SERVER_API_KEY}"
      }
    }
  }
}
```

**OpenCode'de Aktifleştirme:**

1. Coolify MCP Server'ı HTTP modunda çalıştırın (bkz. [Bölüm 4.2](#42-remote-http--sunucu-modu)).
2. Yukarıdaki yapılandırmayı `opencode.remote.jsonc` dosyanıza ekleyin.
3. `MCP_SERVER_API_KEY` ortam değişkenini tanımlayın:
   ```bash
   export MCP_SERVER_API_KEY=guclu-bir-api-anahtari
   ```
4. OpenCode'i yeniden başlatın.

> **İpucu:** Remote bağlantı için MCP Server'ı bir reverse proxy arkasında HTTPS ile yayınlamanız önerilir. Doğrudan internete açmayın.

---

## 6. Docker ile Kurulum

Proje, multi-stage Docker build ile hazırlanmış bir `Dockerfile` içerir. Production için optimize edilmiştir: non-root kullanıcı, HEALTHCHECK, minimum imaj boyutu.

```bash
# 1. İmajı build et
docker build -t coolify-mcp .

# 2. Container'ı çalıştır (HTTP modu)
docker run -d --name coolify-mcp --restart unless-stopped \
  -p 3000:3000 \
  -e COOLIFY_URL=https://coolify.ornek.com \
  -e COOLIFY_API_TOKEN=cof_token_... \
  -e MCP_TRANSPORT=http \
  -e MCP_SERVER_API_KEY=guclu-bir-api-anahtari \
  coolify-mcp

# 3. Health check'in çalıştığını doğrula
curl http://localhost:3000/healthz
```

### Docker Compose ile

```yaml
version: "3.9"
services:
  coolify-mcp:
    build: .
    environment:
      COOLIFY_URL: "https://coolify.ornek.com"
      COOLIFY_API_TOKEN: "${COOLIFY_API_TOKEN}"
      MCP_TRANSPORT: "http"
      MCP_HTTP_PORT: "3000"
      MCP_SERVER_API_KEY: "${MCP_SERVER_API_KEY}"
      COOLIFY_OPERATION_MODE: "read-only"
    ports:
      - "3000:3000"
    restart: unless-stopped
```

```bash
docker compose up -d
```

### Dockerfile Yapısı

| Stage | Temel İmaj | Amaç |
|-------|-----------|------|
| `builder` | `node:22-alpine` | Bağımlılıkları yükle, TypeScript'i derle |
| `runner` | `node:22-alpine` | Minimal production imajı, non-root `mcp` kullanıcısı |

- **HEALTHCHECK:** Her 30 sn'de bir `GET /healthz` endpoint'ini kontrol eder.
- **Non-root:** `mcp` kullanıcısı (UID 1001) ile çalışır.
- **Port:** 3000 (EXPOSE).

---

## 7. Doğrulama

Kurulumun doğru çalıştığını kontrol etmek için aşağıdaki komutları sırayla çalıştırın:

### 7.1. Derleme Kontrolü

```bash
npm run build
# tsup ile dist/index.js oluşur, hata yoksa tamam.
```

### 7.2. Tip Kontrolü

```bash
npm run typecheck
# tsc --noEmit — tip hatası yoksa geçer.
```

### 7.3. Testler

```bash
npm test
# vitest ile tüm test suite'i çalıştırır.
```

### 7.4. HTTP Health Check (HTTP modunda)

```bash
curl http://localhost:3000/healthz
# {"ok":true,"status":"alive"}
```

### 7.5. MCP Health Tool (her iki modda)

Bir MCP istemcisi (OpenCode, Claude Desktop vb.) üzerinden:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "coolify_health",
    "arguments": {}
  }
}
```

Başarılı yanıt:

```json
{
  "content": [{
    "text": "{\n  \"ok\": true,\n  \"coolifyUrl\": \"[CONFIGURED]\",\n  \"authStatus\": \"authenticated\",\n  \"latencyMs\": 42,\n  \"transport\": \"stdio\"\n}"
  }]
}
```

---

## 8. Kullanım Örnekleri

Sunucu toplam **15 araç (tool)** kaydeder: 10 okuma (read-only) ve 5 aksiyon (mutasyon). Aşağıda en sık kullanılan araçlar için örnekler bulabilirsiniz.

### 8.1. `coolify_health` — Bağlantı Kontrolü

Coolify API ve MCP sunucusu arasındaki bağlantıyı test eder.

```json
{
  "name": "coolify_health",
  "arguments": {}
}
```

```json
{
  "ok": true,
  "summary": "Coolify API is reachable and authenticated",
  "data": {
    "ok": true,
    "coolifyUrl": "https://coolify.ornek.com",
    "authStatus": "authenticated",
    "latencyMs": 42,
    "transport": "stdio"
  },
  "meta": { "durationMs": 42 }
}
```

### 8.2. `coolify_list_projects` — Projeleri Listeleme

```json
{
  "name": "coolify_list_projects",
  "arguments": {
    "name": "my-project"
  }
}
```

```json
{
  "ok": true,
  "summary": "Found 1 project(s)",
  "data": [
    {
      "uuid": "a1b2c3d4-...",
      "name": "my-project",
      "description": "Production web app"
    }
  ],
  "meta": { "durationMs": 120, "truncated": false }
}
```

### 8.3. `coolify_project_overview` — Proje Genel Görünümü

Tek bir çağrıyla proje bilgisi, ortamlar, kaynak durumu ve son deploy'ları getirir (4 API çağrısını tek bir araçta birleştirir).

```json
{
  "name": "coolify_project_overview",
  "arguments": {
    "project_uuid": "a1b2c3d4-..."
  }
}
```

### 8.4. `coolify_deploy` — Deploy

```json
{
  "name": "coolify_deploy",
  "arguments": {
    "resource_uuid": "x1y2z3-...",
    "resource_type": "application",
    "force": false,
    "environment_name": "staging"
  }
}
```

> **Not:** Deploy işlemi 3 katmanlı politika denetiminden geçer: (1) Operation Mode, (2) Scope/Allowlist, (3) Production Guard. Herhangi bir katmanda reddedilirse `POLICY_DENIED` hatası döner.

---

## 9. Güvenlik Tavsiyeleri

### 9.1. Least-Privilege Token Kullanımı

`COOLIFY_API_TOKEN` tek başına yeterlidir ancak güvenlik için **kapsamlı token'lar** kullanmanız önerilir:

| Token | Scope | Kullanım Amacı |
|-------|-------|----------------|
| `COOLIFY_READ_TOKEN` | `view:projects`, `view:resources` | Listelemeler ve sorgulamalar |
| `COOLIFY_SENSITIVE_TOKEN` | `view:envs`, `view:logs` | Log ve env değişkeni okuma |
| `COOLIFY_DEPLOY_TOKEN` | `deploy:applications` | Deploy/restart/start |
| `COOLIFY_WRITE_TOKEN` | `edit:envs`, `operate:applications` | Env yazma, stop |

Sunucu her işlem için **en düşük yetkili token'ı** otomatik seçer.

### 9.2. Read-Only Modda Başlatma

Production'da varsayılan olarak `read-only` mod kullanın:

```bash
COOLIFY_OPERATION_MODE=read-only
```

Bu modda 5 aksiyon aracının tümü `POLICY_DENIED` döndürür. Sadece gözlem yapılır, hiçbir değişiklik gerçekleşmez.

### 9.3. Remote MCP İçin Güçlü API Key

HTTP modunda `MCP_SERVER_API_KEY` zorunludur. Güçlü bir anahtar oluşturmak için:

```bash
openssl rand -hex 32
# Örnek çıktı: 7f8a9b3c2d1e0f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f
```

Bu anahtarı `.env` dosyasına veya güvenli bir secret yöneticisine koyun. Asla koda gömmeyin.

### 9.4. Allowlist ile Scope Kısıtlama

Sunucuyu belirli proje/ortam/kaynaklarla sınırlamak için allowlist kullanın:

```bash
COOLIFY_ALLOWED_PROJECT_UUIDS=abc-...,def-...
COOLIFY_ALLOWED_RESOURCE_UUIDS=xyz-...
```

Allowlist boş olduğunda tüm kaynaklara erişime izin verilir. Doldurulduğunda sadece listedeki UUID'lere sahip kaynaklara işlem yapılabilir.

### 9.5. Production Korumasını Açık Tutun

```bash
# En katı ayarlar (varsayılan)
COOLIFY_DENY_PRODUCTION_MUTATIONS=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

Bu ayarlarla production ortamlarına herhangi bir mutasyon (deploy, restart, stop, env değişikliği) tamamen engellenir.

### 9.6. Secret'ların Otomatik Redaksiyonu

- **Environment değişkenlerinin değerleri ASLA döndürülmez.** `coolify_list_environment_variables` aracı yalnızca anahtarları (key) ve metaveriyi döndürür.
- Loglar `Bearer`, `password`, `secret`, `api_key` kalıplarına karşı taranır ve otomatik redakte edilir.
- Pino logger'da hassas alanlar için built-in redaksiyon yolları tanımlıdır.
- Denetim (audit) olayları gizli değerler içermez.

---

## 10. Sorun Giderme

### 10.1. Sunucu Başlamıyor

| Hata | Neden | Çözüm |
|------|-------|-------|
| `Configuration validation failed: coolifyUrl: Required` | `COOLIFY_URL` değişkeni tanımlanmamış | `.env` dosyasına `COOLIFY_URL=https://coolify.ornek.com` ekleyin |
| `Configuration validation failed: coolifyUrl: Invalid URL` | `COOLIFY_URL` geçerli bir URL değil | Protokolü ekleyin: `https://coolify.ornek.com` (sadece `coolify.ornek.com` değil) |
| `MCP_SERVER_API_KEY is required for HTTP transport mode` | HTTP modunda API key eksik | `MCP_SERVER_API_KEY` tanımlayın: `openssl rand -hex 32` ile güçlü bir anahtar oluşturun |

### 10.2. Kimlik Doğrulama Hataları

| Hata | Neden | Çözüm |
|------|-------|-------|
| `AUTHENTICATION_FAILED` — "No Coolify API token configured" | Hiçbir token tanımlanmamış | En az `COOLIFY_API_TOKEN` veya `COOLIFY_READ_TOKEN` tanımlayın |
| `AUTHENTICATION_FAILED` — "Token invalid or expired" | Token geçersiz veya süresi dolmuş | Coolify panelinden yeni bir token oluşturun |
| `PERMISSION_DENIED` — "Token lacks required scope" | Token'ın yetkisi yetersiz | Coolify'de token scope'larına gerekli izinleri ekleyin |

### 10.3. Politika Reddi

| Hata | Neden | Çözüm |
|------|-------|-------|
| `POLICY_DENIED` — "Operation mode is 'read-only'" | Mod yetersiz | `COOLIFY_OPERATION_MODE`'u `deploy-only` veya `safe-write` yapın |
| `POLICY_DENIED` — "Resource not in allowed list" | UUID allowlist'te yok | Allowlist'e ilgili UUID'yi ekleyin veya allowlist'i boş bırakın |
| `POLICY_DENIED` — "Production mutations are denied" | Production ortamına mutasyon engeli | Ya production olmayan ortam kullanın ya da `COOLIFY_DENY_PRODUCTION_MUTATIONS=false` yapın |
| `POLICY_DENIED` — "Stop operations are disabled" | Stop işlemi kapalı | `COOLIFY_ALLOW_STOP=true` olarak ayarlayın |
| `POLICY_DENIED` — "Environment variable write operations are disabled" | Env yazma kapalı | `COOLIFY_ALLOW_ENV_WRITE=true` olarak ayarlayın |

### 10.4. Bağlantı Sorunları

| Hata | Neden | Çözüm |
|------|-------|-------|
| `COOLIFY_UNAVAILABLE` — "Coolify instance unreachable" | Coolify URL'sine erişilemiyor | URL'yi kontrol edin, Coolify instance'ının çalıştığından emin olun |
| `REQUEST_TIMEOUT` | İstek 30 saniyeyi aştı | Ağ bağlantısını kontrol edin, Coolify yükünü azaltın |
| `RATE_LIMITED` | Coolify API rate limit aşıldı | Bekleyip tekrar deneyin (retryable ✅) |

### 10.5. HTTP Transport Çalışmıyor

```bash
# 1. API key'in ayarlandığından emin olun
echo $MCP_SERVER_API_KEY

# 2. Health endpoint'i kontrol edin
curl -v http://localhost:3000/healthz

# 3. MCP endpoint'ini token ile test edin
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer ${MCP_SERVER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### 10.6. Logların Kesilmesi

**Belirti:** Loglar istenenden daha az satır döndürüyor.

**Neden:** Sunucu `COOLIFY_LOG_MAX_LINES` ile sınırlıdır (varsayılan: 200, maks: 1000).

**Çözüm:** `COOLIFY_LOG_MAX_LINES=1000` olarak artırın veya daha az satır isteyin.

---

## Ek: Araç Kataloğu

Sunucuda kayıtlı 15 araç:

### Okuma Araçları (10)

| # | Araç Adı | Açıklama |
|---|----------|----------|
| 1 | `coolify_health` | Bağlantı ve kimlik doğrulama kontrolü |
| 2 | `coolify_list_projects` | Projeleri listele (opsiyonel isim filtresiyle) |
| 3 | `coolify_get_project` | UUID ile tek proje getir |
| 4 | `coolify_list_resources` | Kaynakları filtreleyerek listele |
| 5 | `coolify_get_resource` | UUID ile tek kaynak detayı (DB URL'leri redakte edilir) |
| 6 | `coolify_project_overview` | Proje genel görünümü (4 API çağrısını birleştirir) |
| 7 | `coolify_list_deployments` | Deployment'ları listele (en yenisi önce) |
| 8 | `coolify_get_deployment` | UUID ile deployment detayı |
| 9 | `coolify_get_application_logs` | Uygulama loglarını getir (sırlar redakte edilir) |
| 10 | `coolify_list_environment_variables` | Env değişkenlerini listele (değerler asla döndürülmez) |

### Aksiyon Araçları (5)

| # | Araç Adı | Açıklama | Varsayılan Durum |
|---|----------|----------|-----------------|
| 11 | `coolify_deploy` | Kaynak deploy et | Her modda mod'a bağlı |
| 12 | `coolify_restart` | Kaynağı yeniden başlat | Her modda mod'a bağlı |
| 13 | `coolify_start` | Durdurulmuş kaynağı başlat | Her modda mod'a bağlı |
| 14 | `coolify_stop` | Kaynağı durdur | `COOLIFY_ALLOW_STOP=true` gerektirir |
| 15 | `coolify_set_environment_variable` | Env değişkeni ekle/güncelle | `COOLIFY_ALLOW_ENV_WRITE=true` gerektirir |

Tüm aksiyon araçları şu 3 katmanlı politika denetiminden geçer:

1. **Operation Mode** — Mod bu işleme izin veriyor mu?
2. **Scope/Allowlist** — Hedef kaynak allowlist'te mi (tanımlıysa)?
3. **Production Guard** — Production ortamı hedefleniyorsa mutasyon engellenmeli mi?

---

## Ek: Production için Önerilen Yapılandırmalar

### Sıkı — Production'da Hiçbir Mutasyona İzin Verme (Varsayılan)

```bash
COOLIFY_OPERATION_MODE=read-only
COOLIFY_DENY_PRODUCTION_MUTATIONS=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

### Orta — Production'a Sadece Deploy İzni

```bash
COOLIFY_OPERATION_MODE=deploy-only
COOLIFY_DENY_PRODUCTION_MUTATIONS=false
COOLIFY_ALLOW_PRODUCTION_DEPLOY=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

### Gelişmiş — Staging'de Tam Yetki, Production'da Sadece Deploy

```bash
# Staging ortamı için ayrı bir MCP instance'ı:
COOLIFY_OPERATION_MODE=safe-write
COOLIFY_ALLOW_STOP=true
COOLIFY_ALLOW_ENV_WRITE=true

# Production ortamı için ayrı MCP instance'ı:
COOLIFY_OPERATION_MODE=deploy-only
COOLIFY_DENY_PRODUCTION_MUTATIONS=false
COOLIFY_ALLOW_PRODUCTION_DEPLOY=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

---

## Ek: Hata Kodları

| Kod | Anlamı | Tekrar Denenebilir mi? |
|-----|--------|----------------------|
| `AUTHENTICATION_FAILED` | Token eksik veya geçersiz | ❌ |
| `PERMISSION_DENIED` | Token'ın yetkisi yetersiz | ❌ |
| `POLICY_DENIED` | MCP politikası tarafından engellendi | ❌ |
| `RESOURCE_NOT_FOUND` | Kaynak bulunamadı (404) | ❌ |
| `RATE_LIMITED` | Coolify API rate limit aşıldı (429) | ✅ |
| `COOLIFY_UNAVAILABLE` | Coolify instance'ına erişilemiyor (5xx) | ✅ |
| `REQUEST_TIMEOUT` | İstek 30sn zaman aşımına uğradı | ✅ |
| `VALIDATION_ERROR` | Geçersiz girdi parametreleri | ❌ |
| `UPSTREAM_ERROR` | Genel Coolify API hatası | değişir |
| `INTERNAL_ERROR` | MCP sunucu iç hatası | ❌ |

---

## Referanslar

- [Coolify MCP Server README](../README.md)
- [.env.example](../.env.example)
- [OpenCode MCP Konfigürasyonu](https://opencode.ai/docs/mcp)
- [Coolify API Dokümantasyonu](https://coolify.io/docs/api-reference)
