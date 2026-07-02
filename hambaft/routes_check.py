from __future__ import unicode_literals
import frappe

def check():
    ws = frappe.get_doc('Website Settings')
    print(f"home_page={ws.home_page}")
    
    route_cache = frappe.cache().get_value('website_route_rules', dict())
    print(f"total_routes={len(route_cache)}")
    for r in route_cache:
        print(f"  route: {r}")
    
    # Also check if the www dir is being picked up
    import os
    www_dir = frappe.get_app_path('hambaft', 'www')
    print(f"www_dir={www_dir}")
    print(f"www_exists={os.path.exists(www_dir)}")
    for root, dirs, files in os.walk(www_dir):
        for f in files:
            print(f"  www_file: {os.path.join(root, f)}")
