we are working on Servicenow Catalog Items and these catalog items contains the following related lists:
Variables
Variable Sets
Catalog UI Policies
Catalog Client Scripts
Available For
Not Available For
Categories (1)
Catalogs (1)
Catalog Data Lookup Definitions
Related Articles
Related Catalog Items
Assigned Topics

- I want to add the ability to be able to clone catalog item with its realted lists
I will be including an example xml file for an exported catalog item 
after investigation the clonning process I have found the following:
1- when I did insert and stay a catalog item the catalog item get inserted but related list is not included
2- I did try to export the variables for example (from xml export) and I read the xml and found that the related list contains the following name and sys_id
<cat_item display_value="Demand Planning">SYS_ID</cat_item> for example 4a09c563c31d07d029d17fedd4013124
3- when I modified the name ("Demand Planning") to ("Hossam Service POC") which is the new catalog item name that I added before pressing insert and stay and sys_id 4a09c563c31d07d029d17fedd4013124 (old sys_id) to abbc3994c3b5cf5429d17fedd4013152 (new sys_id)
4- the related list which is variables got created in the new cloned catalog item ("Hossam Service POC") but got removed from the old ("Demand Planning")
5- so while creating a new variables I added a new randomise sys_id for the variables following Servicenow sys_id (how it creates new sys_id) for the new variables
6- variables got created in the new related list

