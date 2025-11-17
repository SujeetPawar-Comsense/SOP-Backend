"""
Business Rules to Module Mapper
Maps business rules to their applicable modules based on rule content
"""

def map_rule_to_modules(rule_name: str, rule_description: str = "") -> list:
    """
    Map a business rule to its likely applicable modules based on keywords
    """
    rule_text = (rule_name + " " + rule_description).lower()
    
    # Define module mappings based on keywords
    module_mappings = {
        "Authentication": [
            "password", "login", "registration", "email", "phone", "unique user",
            "user identifier", "account", "sign up", "sign in", "authentication"
        ],
        "User Management": [
            "user", "customer", "seller", "admin", "profile", "account management"
        ],
        "Product Catalog": [
            "product", "listing", "catalog", "inventory", "stock", "product approval",
            "seller product", "product modification"
        ],
        "Shopping Cart": [
            "cart", "shopping cart", "add to cart", "stock availability", "in-stock"
        ],
        "Order Management": [
            "order", "order status", "order placement", "processing", "shipped",
            "delivered", "workflow", "stock reservation"
        ],
        "Payment": [
            "payment", "payment gateway", "pci", "card", "financial", "cod",
            "cash on delivery", "payment method"
        ],
        "Returns & Refunds": [
            "return", "refund", "return window", "return policy", "refund processing"
        ],
        "Admin Dashboard": [
            "admin", "administrative", "approval", "logging", "audit", "admin action"
        ],
        "Rewards & Loyalty": [
            "reward", "point", "loyalty", "earning", "redemption", "reward point"
        ],
        "Performance & Infrastructure": [
            "performance", "uptime", "scalability", "load", "concurrent", "system architecture"
        ],
        "Security & Compliance": [
            "security", "compliance", "encryption", "data security", "pci dss", "audit"
        ],
        "Notifications": [
            "notification", "alert", "email notification", "sms"
        ],
        "Search": [
            "search", "filter", "query"
        ],
        "Checkout": [
            "checkout", "order placement", "payment processing"
        ]
    }
    
    applicable_modules = []
    
    for module, keywords in module_mappings.items():
        for keyword in keywords:
            if keyword in rule_text:
                if module not in applicable_modules:
                    applicable_modules.append(module)
                break
    
    # If no specific modules found, it might apply to all
    if not applicable_modules:
        applicable_modules = ["All Modules"]
    
    return applicable_modules


# Specific rule mappings for ShopEase e-commerce platform
SHOPEASY_RULES_MAPPING = {
    "User Password Policy": ["Authentication", "User Management"],
    "Unique User Identifiers": ["Authentication", "User Management"],
    "Product Stock Availability": ["Product Catalog", "Shopping Cart", "Order Management"],
    "Order Stock Reservation": ["Order Management", "Shopping Cart", "Checkout"],
    "Payment Gateway Compliance": ["Payment", "Checkout", "Security & Compliance"],
    "Order Status Workflow": ["Order Management", "Admin Dashboard"],
    "Return Window Policy": ["Returns & Refunds", "Order Management"],
    "Refund Processing Time": ["Returns & Refunds", "Payment"],
    "Seller Product Approval": ["Product Catalog", "Admin Dashboard"],
    "Admin Action Logging": ["Admin Dashboard", "Security & Compliance"],
    "Performance Threshold": ["Performance & Infrastructure", "All Modules"],
    "System Uptime": ["Performance & Infrastructure", "All Modules"],
    "Scalability Requirements": ["Performance & Infrastructure", "All Modules"],
    "Data Security Compliance": ["Security & Compliance", "All Modules"],
    "COD Restrictions": ["Payment", "Checkout", "Order Management"],
    "Reward Point Earning Criteria": ["Rewards & Loyalty", "Order Management"],
    "Reward Point Redemption Criteria": ["Rewards & Loyalty", "Checkout", "Payment"]
}


def get_modules_for_rule(rule_name: str, rule_description: str = "") -> list:
    """
    Get applicable modules for a business rule
    """
    # First check if we have a specific mapping
    for key in SHOPEASY_RULES_MAPPING:
        if key.lower() in rule_name.lower():
            return SHOPEASY_RULES_MAPPING[key]
    
    # Otherwise, use keyword-based mapping
    return map_rule_to_modules(rule_name, rule_description)
