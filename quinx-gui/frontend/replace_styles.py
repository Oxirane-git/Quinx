import os
import re

directory = r"c:\Users\Sahil\Desktop\Quinx\quinx-saas\frontend\src"

replacements = [
    (r'bg-black', 'bg-surface'),
    (r'bg-zinc-950', 'bg-surface'),
    (r'bg-zinc-900/50', 'bg-surface shadow-sm'),
    (r'bg-zinc-900/30', 'bg-surface shadow-sm'),
    (r'bg-zinc-900', 'bg-surface'),
    (r'bg-zinc-800', 'bg-slate-100'),
    (r'bg-zinc-700', 'bg-slate-200'),
    
    (r'border-zinc-800/50', 'border-border'),
    (r'border-zinc-800', 'border-border'),
    (r'border-zinc-700', 'border-border'),
    
    (r'text-zinc-200', 'text-textMain'),
    (r'text-zinc-300', 'text-textMain'),
    (r'text-zinc-400', 'text-textMain text-sm'),
    (r'text-zinc-500', 'text-textMuted'),
    (r'text-zinc-600', 'text-textMuted'),
    
    (r'text-accent', 'text-primary'),
    (r'bg-accent/20', 'bg-primary/20'),
    (r'bg-accent/10', 'bg-primary/10'),
    (r'bg-accent/5', 'bg-primary/5'),
    (r'hover:bg-accent/20', 'hover:bg-primary/20'),
    (r'hover:text-accent', 'hover:text-primary'),
    (r'hover:border-accent', 'hover:border-primary'),
    (r'hover:bg-accent', 'hover:bg-primaryHover hover:text-white'),
    (r'focus:border-accent', 'focus:border-primary focus:ring-1 focus:ring-primary'),
    (r'border-accent/20', 'border-primary/20'),
    (r'border-accent', 'border-primary text-primary bg-primary/5'),
    
    (r'text-shadow-accent', ''),
    (r'shadow-\[0_0_10px_rgba\(0,255,136,0\.1\)\]', 'shadow'),
    (r'shadow-\[0_0_15px_rgba\(0,255,136,0\.2\)\]', 'shadow-md'),
    (r'shadow-\[__\]', ''),
    
    # Remove excessive font-mono where possible, but safely. Just string replace
    (r'font-mono', ''),
    
    # Text changes
    (r'text-zinc-400', 'text-textMuted'),
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
            
            # Post-replacements cleanups
            new_content = new_content.replace('className=" ', 'className="')
            new_content = new_content.replace('  ', ' ')
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")
