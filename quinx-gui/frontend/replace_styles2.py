import os
import re

directory = r"c:\Users\Sahil\Desktop\Quinx\quinx-saas\frontend\src"

replacements = [
    (r'accent-accent', 'accent-primary'),
    (r'bg-accent shadow-\[[^\]]+\]', 'bg-primary'),
    (r'bg-accent', 'bg-primary'),
    (r'via-accent', 'via-primary'),
    (r'bg-gradient-to-r from-transparent via-primary to-transparent opacity-20', 'bg-primary h-1 opacity-20'),
    (r'shadow-\[[^\]]+\]', ''),  # Clear any remaining custom drop-shadows
    (r'focus:ring-accent/50', 'focus:ring-primary/50'),
    (r'border-accent', 'border-primary'),
    (r'text-accent', 'text-primary'),
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")
