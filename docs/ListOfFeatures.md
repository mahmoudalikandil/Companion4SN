# Companion4SN - Feature Documentation Index

This index lists all developer tools and features built into the *Companion4SN* extension. Each feature is detailed in its corresponding specification file, explaining its capabilities, technical designs, user interfaces, and API contracts.

---

## 📋 Feature Directory

1. **[Excel-Based Catalog Item Bulk Builder](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/1_CatalogItemBulkBuilder.md)**
   - Downloads structured templates with dynamic live dropdown validations, parses sheets locally, and processes atomic server-side transactions with simulation dry runs and rollback protections.
2. **[Catalog Item Cloner](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/2_CatalogItemCloner.md)**
   - Secure server-side duplicator for catalog items, record producers, order guides, variables, client scripts, UI policies, and translations, re-mapping variables sys_ids internally.
3. **[User Roles & ACL Permission Analyzer](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/3_UserRelatedRoles.md)**
   - Maps a target user's collapsible groups, roles, and contained roles tree, and runs impersonated server-side CRUD checks to identify exact missing roles on denied ACL operations.
4. **[Rapid Impersonator](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/4_RapidImpersonator.md)**
   - Instantly look up active users by Name, Username, or Email and switch session context directly from the popup.
5. **[Background Script Runner](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/5_BackgroundScript.md)**
   - Server-side JavaScript editor to execute code, choose scopes, load templates, and inspect stdout terminal output logs.
6. **[Scope & Update Set Switcher](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/6_UpdateSets.md)**
   - Session context manager to view and switch the active Application Scope and Update Set.
7. **[Dictionary Exporter](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/7_DictionaryExporter.md)**
   - Schema details extractor that resolves table extends inheritance paths recursively and downloads structures as JSON or CSV files.
8. **[Background Flow Tracker](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/8_BackgroundFlowTracker.md)**
   - Flow Designer execution tracker that polls execution status in background workers and fires push notifications when complete.
9. **[Real-Time Log Streamer](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/9_RealTimeLogs.md)**
   - Tails the instance syslog, showing color-coded logs dynamically based on severity with built-in regex query filters.
10. **[XML Payload Studio](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/10_XMLPayloadStudio.md)**
    - Formats XML documents and strips out tracking metadata headers to facilitate clean version control commits.
11. **[Cancel Running Transactions](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/11_CancelTransactions.md)**
    - Track and terminate active long-running transactions and background script threads lockups on the server.
12. **[Instance Health Stats (Stats.do)](file:///c:/Users/MahmoudQandeel/OneDrive - Plat4mation/Desktop/SNOW_XML_PERIUEMEM_TOOL/docs/12_InstanceHealth.md)**
    - Scrapes, parses, and formats diagnostic server statistics (memory usage, database pools, build version) into visual dashboard metrics.