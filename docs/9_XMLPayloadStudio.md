# 9. Feature Specification: XML Payload Studio

## 1. Executive Summary
ServiceNow records can be exported and imported as XML files. However, exported XMLs are raw, unindented, and contain complex system metadata headers (like creation dates, update authors, or modification counts). Preparing these payloads for import into clean environments or committing them to git repositories requires tedious manual formatting and stripping of metadata.

The **XML Payload Studio** is an offline-capable utility inside the extension designed to format XMLs, strip out tracking metadata (ensuring clean diffs), and download or copy records with a single click.

---

## 2. Key Capabilities

### A. Dynamic XML Beautifier
- **Description:** A formatting engine designed to structure raw XML.
- **Formatting Logic:** Splits tags on line breaks, detects self-closing tags, and applies nested indents (4 spaces per level) to make the structure human-readable.

### B. System Metadata Stripping
- **Description:** Automatically detects and strips ServiceNow system tracking tags.
- **Tags Removed:**
  - `sys_id` (record unique ID)
  - `sys_created_by` / `sys_created_on` (creation metadata)
  - `sys_updated_by` / `sys_updated_on` (update metadata)
  - `sys_mod_count` (modification sequence count)
  - `sys_tags` (profile tags)
- **Use Case:** Crucial for generating clean, environment-agnostic update payloads that do not overwrite target system sys_ids or cause git version control noise.

### C. Offline Export Helpers
- **Description:** Single-click copy to clipboard and file exporter.
- **Exporting Options:**
  - **Copy:** Copies text directly using `navigator.clipboard`.
  - **Download:** Formats text into a download blob link as a `.xml` file.

---

## 3. Technical Architecture & Security
- **Offline Integrity:** Runs entirely within the browser extension sandbox. No data or payloads are sent to external servers, protecting sensitive company data.
- **Regex Cleaning:** Uses optimized multi-line regular expressions to extract and strip tags without XML parser overhead.

---

## 4. UI/UX Interface Design
- **Header:** Displays title and "Offline Utility" badge.
- **Toolbar Buttons:** Quick action utility buttons:
  - **Format / Beautify:** Indents the XML.
  - **Strip SNOW Meta:** Strips the metadata tags.
  - **Copy to Clipboard:** Copies the content.
  - **Download .xml:** Downloads the file.
- **Editor Window:** A monospace text area editor (`#xmlEditorArea`) containing line breaks and horizontal scrollbars.

---

## 5. JavaScript Implementation details
- **Formatting Function:** `formatXMLText(xml)`
- **Metadata Stripping Regular Expression:**
  ```javascript
  const tagsToStrip = ['sys_id', 'sys_created_by', 'sys_created_on', 'sys_updated_by', 'sys_updated_on', 'sys_mod_count', 'sys_tags'];
  tagsToStrip.forEach(tag => {
      const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>\\n?`, 'g');
      xml = xml.replace(regex, '');
  });
  ```
