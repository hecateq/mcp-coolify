# 🔧 Coolify MCP Server — Tool Envanteri

> Oluşturulma: 2026-08-12 | Kaynak: MCP protokolü üzerinden görünen tool tanımları + gerçek tool çağrıları

---

## 1. Tool Listesi (42 tool)

> Not: `*` = zorunlu parametre. `[enum]` = action/status parametrelerinin alabileceği değerler.

### 📦 Deployments & Repo

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `deploy` | resource_uuid, resource_type `[application\|service\|database]`, force (bool), environment_name | ✓ uuid, type |
| `cancel_deployment` | deployment_uuid | ✓ |
| `list_deployments` | resource_uuid, status `[queued\|in_progress\|finished\|failed\|cancelled-by-user]`, limit | — |
| `get_deployment` | deployment_uuid | ✓ |
| `list_branches` | github_app_uuid, owner, repository | ✓ hepsi |
| `list_github_apps` | — | — |
| `list_repositories` | github_app_uuid, search, page, limit | ✓ app uuid |

### 🖥️ Servers & Infrastructure

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `health` | — | — |
| `list_servers` | — | — |
| `get_server` | uuid | ✓ |
| `validate_server` | server_uuid | ✓ |
| `list_server_resources` | server_uuid, resource_type `[application\|service\|database]`, status | ✓ server |
| `list_server_domains` | server_uuid | ✓ |

### 📁 Projects & Environments

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `list_projects` | name (filtre) | — |
| `get_project` | uuid | ✓ |
| `create_project` | name, description | ✓ name |
| `create_environment` | project_uuid, name | ✓ |
| `project_overview` | project_uuid | ✓ |

### 🚀 Applications

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `list_resources` | project_uuid, environment_uuid, resource_type `[application\|service\|database\|postgresql\|mysql\|redis\|mongodb]`, status `[running\|stopped\|degraded\|restarting\|exited]`, search | — |
| `get_resource` | uuid, type `[application\|service\|database]` | ✓ |
| `create_application` | project_uuid, environment_uuid, name, source_type `[public\|private-github-app\|private-deploy-key\|dockerfile\|dockerimage]`, repository_url, branch, build_pack, port (int), domains | ✓ proje, env, name |
| `update_application_config` | application_uuid, name, description, fqdn, health_check (bool), cpu_limit, memory_limit, cpu_shares (2-1024), replicas (1-10), ports, build_pack, base_directory, dockerfile_location, auto_deploy (bool), previews (bool) | ✓ app uuid |
| `get_application_logs` | application_uuid, lines (10-1000) | ✓ app uuid |
| `start` / `stop` / `restart` | resource_uuid, resource_type, environment_name | ✓ |

### 🗄️ Databases

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `create_database` | project_uuid, environment_uuid, server_uuid, database_type `[postgresql\|mysql\|mongodb\|redis\|mariadb\|keydb\|dragonfly\|clickhouse]`, name, version | ✓ proje, env, server, type, name |
| `update_database_config` | database_uuid, name, description, cpu_limit, memory_limit | ✓ db uuid |

### ⚙️ Services

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `create_service` | project_uuid, environment_uuid, server_uuid, name, service_type, docker_compose_raw | ✓ proje, env, server, name |

### 🌿 Env Vars

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `list_environment_variables` | ⚠️ **parametre YOK** (bug gibi görünüyor) | — |
| `set_environment_variable` | resource_uuid, key, value, environment_name | ✓ uuid, key, value |
| `set_environment_variables` | resource_uuid, resource_type, variables (1-50 adet {key,value}), environment_name | ✓ uuid, type, variables |

### 💾 Backups

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `create_backup_config` | database_uuid, schedule (cron), destination_uuid, retention (1-365), enabled (bool) | ✓ db, schedule |
| `list_database_backups` | database_uuid | ✓ |

### 👥 Teams

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `get_current_team` | — | — |
| `list_team_members` | — | — |

### 🔁 Scheduled Tasks & Storage

| Tool | Parametreler | Zorunlu |
|---|---|---|
| `create_scheduled_task` | resource_uuid, resource_type `[application\|service]`, name, command, schedule (cron), container, timeout (≤86400s), enabled | ✓ uuid, type, name, command, schedule |
| `update_scheduled_task` | task_uuid, resource_uuid, resource_type, name, command, schedule, container, timeout, enabled | ✓ task, uuid, type |
| `get_task_executions` | task_uuid, resource_uuid, resource_type, status `[running\|completed\|failed\|cancelled]`, limit | ✓ task, uuid |
| `list_scheduled_tasks` | resource_uuid, resource_type | ✓ uuid |
| `create_storage` | resource_uuid, resource_type `[application\|service\|database]`, storage_type `[volume\|bind\|cifs\|nfs]`, source, destination, name | ✓ uuid, type, source, dest |
| `list_storages` | resource_uuid, resource_type | ✓ |

---

## 2. Kategorize Özeti

| Kategori | Tool sayısı | Okuma | Yazma |
|---|---|---|---|
| Infrastructure/Servers | 6 | 5 | 1 (validate) |
| Projects/Environments | 5 | 3 | 2 |
| Applications | 9 | 3 | 6 |
| Databases | 2 | 0 (read → get_resource ile) | 2 |
| Services | 1 | 0 | 1 |
| Deployments/Repo | 7 | 6 | 1 |
| Env Vars | 3 | 1 | 2 |
| Backups | 2 | 1 | 1 |
| Teams | 2 | 2 | 0 |
| Tasks/Storage | 6 | 3 | 3 |

---

## 3. Kapsam Testi

| İşlem | Durum | Açıklama |
|---|---|---|
| **Container exec** (içine girip komut çalıştırma) | ❌ **YOK** | Exec benzeri hiçbir tool yok |
| **CPU/memory limit** | ✅ **VAR** | `update_application_config` (cpu_limit, memory_limit, cpu_shares) + `update_database_config` |
| **Docker prune / disk temizliği** | ❌ **YOK** | Yok |
| **Notification kanalı** (Slack/Discord/email) | ❌ **YOK** | Yok |
| **Domain/SSL/proxy config** | ⚠️ **KISMEN** | `fqdn` + `ports` değiştirilebilir; SSL sertifika/HTTPS yönetimi **yok**; `list_server_domains` sadece okuma |
| **Metrics / resource history** | ❌ **YOK** | Hiçbir metrics tool'u yok — sadece anlık status string'i (`running:healthy`), grafik/history imkânsız |
| **Team davet / rol atama** | ⚠️ **SADECE LİSTELEME** | `list_team_members` var; davet, silme, rol atama **yok** |
| **Backup hedefi (S3) tanımlama** | ⚠️ **KISMEN** | `create_backup_config` `destination_uuid` alıyor ama destination (S3 storage) **oluşturma/yönetme tool'u yok** |
| **Batch işlem** | ❌ **YOK** | Hepsi tek kaynak bazlı; toplu deploy/güncelleme yok |
| **Webhook yönetimi** | ❌ **YOK** | Yok |

---

## 4. Gerçek Çağrı Testi — `project_overview`

`get_infrastructure_overview` diye bir tool **yok**; en yakın karşılık `project_overview`. Gerçek response:

```json
{
  "ok": true,
  "summary": "Overview for project \"Kozmira\": 0 resources, 0 running",
  "data": {
    "project": { "uuid": "rg04ow8cockwgg04wwkks0w0", "name": "Kozmira" },
    "environments": [
      { "uuid": "rks44co0owg4k4g4c44wcgss", "name": "production" }
    ],
    "resources": [],
    "recentDeployments": [],
    "summary": { "totalResources": 0, "running": 0, "stopped": 0, "degraded": 0 }
  },
  "meta": {}
}
```

**Response şekli bulguları:**

- Standart format: `{ok, summary, data, meta}` — güzel ve tutarlı
- **Çok özet düzey**: `get_resource` bile sadece `uuid/name/status` döndürdü — domain, port, image, env bilgisi yok
- **Sensitive alanlar redact**: env value'ları, SSH key'ler, sunucu IP'leri güvenlik gereği asla dönmüyor
- `list_resources` 54 kaynak döndürdü (ad, tip, status) — `project_overview`'daki `resources` array'i ise boş görünüyor (filtreleme davranışı tutarsız olabilir)
- Durum formatı: `"running:healthy"`, `"exited:unhealthy"` gibi bileşik string

---

## 5. Sonuç

### 🟥 Kritik Eksikler

1. **Container exec** — hata ayıklama için en önemli operasyonel yetenek
2. **Metrics/history** — resource kullanımı, CPU/RAM geçmişi, grafik verisi (anlık bile yok, sadece health status)
3. **Notification kanalı yönetimi** — Slack/Discord/email kanalı ekleme/değiştirme
4. **Webhook yönetimi** — otomasyon/entegrasyon için gerekli
5. **Backup destination tanımlama** — S3 vb. hedef oluşturmadan backup config anlamını yitiriyor

### 🟨 Olsa İyi Olur

1. **Docker prune / disk temizliği** — uzun süreli çalışan sunucularda ihtiyaç doğuyor
2. **SSL sertifika yönetimi** — renew, force HTTPS, cert durumu görme
3. **Batch işlemler** — çoklu app'te toplu deploy/stop/restart
4. **Team yazma** — davet etme, rol değiştirme, üye silme
5. **Detaylı resource görünümü** — `get_resource`'un fqdn/port/image/domain içeren genişletilmiş hali

### 🟩 Gerekmeyebilir

1. **Storage snapshot/restore** — Coolify API'sinde zaten yok, MCP'nin eklemesi de beklenmez
2. **Anlık resource usage (live stats)** — `docker stats` benzeri veri API'den gelmiyor, ayrı sunucu erişimi gerekir

---

## Genel Değerlendirme

CRUD ağırlıklı, temiz ve tutarlı bir MCP server. Yaşam döngüsü yönetimi (deploy/start/stop/restart/config) iyi kapsanmış; ama **operasyonel derinlik zayıf** (exec, metrics, notification, webhook yok).

**Bilinen tutarsızlıklar:**
- `list_environment_variables`'ın resource parametresi hiç yok
- `project_overview`'ın resources array'i boş geliyor

Bunlar MCP server'ın kendi bug'ları gibi duruyor.
