import os
import re

directories = ['app', 'components', 'hooks']

replacements = [
    # Schema mappings for variable names
    (r'\bfarmerId\b', 'ownerId'),
    (r'\bbuyerId\b', 'renterId'),
    (r'\bfarmerEmail\b', 'ownerEmail'),
    (r'\bbuyerEmail\b', 'renterEmail'),
    (r'\bfarmerName\b', 'ownerName'),
    (r'\bbuyerName\b', 'renterName'),
    (r'\bfarmerPhone\b', 'ownerPhone'),
    (r'\bbuyerPhone\b', 'renterPhone'),
    (r'\bfarmerImage\b', 'ownerImage'),
    (r'\bbuyerImage\b', 'renterImage'),
    (r'\bcropName\b', 'assetCategory'),
    (r'\bharvestDate\b', 'availableFrom'),
    (r'\bdaysToHarvest\b', 'daysToAvailable'),
    
    # Specific Strings
    (r'Harvest Date', 'Available From'),
    (r'Purchase Now', 'Request to Rent'),
    (r'Buy Now', 'Request to Rent'),
    (r'\bPurchase\b', 'Rent'),
    (r'\bpurchase\b', 'rent'),
    (r'\bpurchasing\b', 'renting'),
    (r'\bpurchased\b', 'rented'),
    
    # Farmer -> Owner
    (r'\bFarmer\b', 'Owner'),
    (r'\bfarmer\b', 'owner'),
    (r'\bFARMER\b', 'OWNER'),
    (r'\bFarmers\b', 'Owners'),
    (r'\bfarmers\b', 'owners'),
    
    # Buyer -> Renter
    (r'\bBuyer\b', 'Renter'),
    (r'\bbuyer\b', 'renter'),
    (r'\bBUYER\b', 'RENTER'),
    (r'\bBuyers\b', 'Renters'),
    (r'\bbuyers\b', 'renters'),
    
    # Crop -> Equipment
    (r'\bCrop\b', 'Equipment'),
    (r'\bcrop\b', 'equipment'),
    (r'\bCrops\b', 'Equipment'),
    (r'\bcrops\b', 'equipment'),
    (r'\bCROP\b', 'EQUIPMENT'),
]

for directory in directories:
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith('.tsx') and not file.endswith('.ts'):
                continue
            
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                print(f"Updated {filepath}")
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

print("Done")
