import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
apps_dir = os.path.join(base_dir, 'apps')
os.makedirs(apps_dir, exist_ok=True)

with open(os.path.join(apps_dir, '__init__.py'), 'w') as f:
    pass

app_names = [
    'accounts',
    'profiles',
    'opportunities',
    'eligibility',
    'recommendations',
    'applications',
    'notifications',
    'ai_assistant',
    'workflows',
    'data_import',
    'analytics',
]

for app in app_names:
    d = os.path.join(apps_dir, app)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, '__init__.py'), 'w') as f:
        pass
    
    # apps.py
    class_name = ''.join(x.capitalize() for x in app.split('_')) + 'Config'
    apps_content = f'''from django.apps import AppConfig

class {class_name}(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.{app}'
'''
    with open(os.path.join(d, 'apps.py'), 'w') as f:
        f.write(apps_content)

print(f"Scaffolded {len(app_names)} apps in {apps_dir}")
