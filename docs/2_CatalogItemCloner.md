# 2. Feature Specification: Catalog Item Cloner

## 1. Executive Summary
Duplicating complex catalog items in ServiceNow is historically time-consuming. Performing an "Insert and Stay" on a `sc_cat_item` record only duplicates the core record, omitting all critical related lists such as variables, UI policies, and client scripts. Manually recreating or export-importing these records is error-prone and often leads to broken variables references and broken script execution.

The **Catalog Item Cloner** provides a secure, transactional, server-side duplicate engine inside the *ServiceNow Live Companion* extension. It automatically extracts active catalog items from tab contexts, duplicates the core catalog item, clones all selected related lists, and updates internal variable reference sys_ids so that client scripts, UI policies, and data lookup relationships function immediately in the cloned item.

---

## 2. Key Capabilities

### A. Auto-Detect Active Source
- **Description:** Leverages the extension bridge to automatically scan the active browser tab.
- **Detection Logic:** Scrapes the DOM to detect if the user is looking at a Catalog Item (`sc_cat_item`), Record Producer (`sc_cat_item_producer`), Order Guide (`sc_cat_item_guide`), or Content Item (`sc_cat_item_content`).
- **Input Pre-population:** Pre-fills the source table, sys_id, and catalog item display name.

### B. Comprehensive Related Lists Cloning
Supports selective replication of 10 distinct classes of related lists via checkboxes:
1. **Variables (`item_option_new`):** Replicates variables, generating randomized target sys_ids.
2. **Variable Sets (`io_set_item`):** Replicates the association links between the catalog item and global variable sets.
3. **Catalog UI Policies (`catalog_ui_policy` & `catalog_ui_policy_action`):** Clones UI policies and nested UI policy actions.
4. **Catalog Client Scripts (`catalog_script_client`):** Clones catalog client scripts (onLoad, onSubmit, onChange).
5. **User Criteria (`sc_cat_item_user_criteria_mtom` & `sc_cat_item_user_criteria_no_mtom`):** Replicates "Available For" and "Not Available For" relationships.
6. **Catalogs & Categories (`sc_cat_item_catalog` & `sc_cat_item_category`):** Duplicates catalog structure listings.
7. **Catalog Data Lookups (`dl_definition_sc_csc`):** Clones data lookup mapping tables.
8. **Related Articles (`kb_2_sc_candidate`):** Links related knowledge articles.
9. **Related Catalog Items (`sc_cat_item_relation`):** Links related items.
10. **Assigned Topics (`topic_item_association`):** Copies taxonomical topic association mappings.

### C. Reference Translation Mapping
- **UI Policy Conditions:** Re-maps condition strings (e.g. `IO:old_sys_id=value`) to reference the newly generated variable sys_ids.
- **Client Scripts:** Re-maps `cat_variable` field for onChange client scripts to point to the cloned variable sys_id.
- **Data Lookups:** Re-maps the target `catalog_variable` reference configuration to the cloned variable.

### D. Multi-Scope Selection
- **Description:** Allows developers to clone the item into a different application scope by querying active scopes on the instance and modifying scope properties during insertion.
- **Safeguards:** Excludes application scope properties during variable duplication so cloned fields inherit the target application scope context.

---

## 3. Technical Architecture & Security
- **Execution Vector:** Posts the transactional execution script block directly to the `/sys.scripts.do` background processor.
- **Transactional Safety:** Uses GlideRecord database execution. If the core item insertion fails, the related lists are skipped to prevent orphaned database records.
- **Session Context:** Runs in the user's active session, respecting ACL write access limitations.

---

## 4. UI/UX Interface Design
- **Header:** Displays title and "Server Script" type badge.
- **Source Configuration Panel:** Pre-filled read-only fields showing Table, Sys ID, and Display Name with an **Auto-Detect** refresh button.
- **Target Inputs:**
  - Text input for the new item name.
  - Dropdown select for target application scopes.
- **Checkbox Grid:** Responsive two-column checkbox grid representing the 10 related lists.
- **Action Button:** Full-width primary action button (**Execute Clone**) that disables while transactions are loading.
- **Execution Console Output:** Dynamic flex-growing scrollable logging window showing stdout details of the clone transaction and outputting a direct clickable form URL for the newly cloned record on success.

---

## 5. API Contracts & JavaScript functions
- **Function:** `SNOW_API.cloneCatalogItem(config)`
- **Configuration Argument:**
  ```json
  {
    "source_id": "4a09c563c31d07d029d17fedd4013124",
    "table": "sc_cat_item",
    "new_name": "New Swag Request",
    "scope": "global",
    "options": {
      "variables": true,
      "variable_sets": true,
      "ui_policies": true,
      "client_scripts": true,
      "user_criteria": true,
      "categories": true,
      "data_lookups": true,
      "related_articles": false,
      "related_items": false,
      "topics": false
    }
  }
  ```
- **Returns:** String console block containing script log flags:
  - Success Indicator: `>>>CLONE_SUCCESS:[NEW_SYS_ID]<<<`
  - Error Indicator: `>>>CLONE_ERROR<<<`