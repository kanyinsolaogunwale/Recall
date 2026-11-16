import os
import re
from PIL import Image, ImageDraw

def generate_icons():
    icon_src = os.path.join('app', 'icons', 'icon-512.png')
    if not os.path.exists(icon_src):
        print(f"Source icon not found: {icon_src}")
        return

    im = Image.open(icon_src).convert('RGBA')
    res_dir = os.path.join('android', 'app', 'src', 'main', 'res')
    if not os.path.exists(res_dir):
        print(f"Res dir does not exist yet: {res_dir}")
        return

    densities = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432),
    }

    for folder, (std_size, fg_size) in densities.items():
        target_dir = os.path.join(res_dir, folder)
        os.makedirs(target_dir, exist_ok=True)

        # 1. Standard icon
        std_icon = im.resize((std_size, std_size), Image.Resampling.LANCZOS)
        std_icon.save(os.path.join(target_dir, 'ic_launcher.png'), 'PNG')

        # 2. Round icon (masked to circle)
        mask = Image.new('L', (std_size, std_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, std_size, std_size), fill=255)
        round_icon = Image.new('RGBA', (std_size, std_size), (0, 0, 0, 0))
        round_icon.paste(std_icon, (0, 0), mask=mask)
        round_icon.save(os.path.join(target_dir, 'ic_launcher_round.png'), 'PNG')

        # 3. Adaptive foreground (108dp canvas, ~66% scaled center)
        fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        inner_size = int(fg_size * 0.70)
        offset = (fg_size - inner_size) // 2
        scaled_inner = im.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        fg_canvas.paste(scaled_inner, (offset, offset), mask=scaled_inner)
        fg_canvas.save(os.path.join(target_dir, 'ic_launcher_foreground.png'), 'PNG')

        print(f"Generated icons for {folder}")

def patch_manifest():
    manifest_path = os.path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml')
    if not os.path.exists(manifest_path):
        print(f"AndroidManifest.xml not found at {manifest_path}")
        return

    with open(manifest_path, 'r', encoding='utf-8') as f:
        content = f.read()

    permissions = [
        'android.permission.INTERNET',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.SCHEDULE_EXACT_ALARM',
        'android.permission.WAKE_LOCK',
        'android.permission.SYSTEM_ALERT_WINDOW',
    ]

    perms_to_add = []
    for p in permissions:
        if p not in content:
            perms_to_add.append(f'    <uses-permission android:name="{p}" />')

    queries_block = """
    <queries>
        <intent>
            <action android:name="android.speech.RecognitionService" />
        </intent>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>
"""

    if perms_to_add:
        # Insert before <application
        insert_text = "\n".join(perms_to_add) + "\n"
        content = re.sub(r'(<application\b)', insert_text + r'\1', content, count=1)

    if '<queries>' not in content:
        # Insert before </manifest>
        content = re.sub(r'(</manifest>)', queries_block.strip() + "\n" + r'\1', content, count=1)

    with open(manifest_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched AndroidManifest.xml successfully with permissions and speech queries.")

def patch_colors():
    colors_path = os.path.join('android', 'app', 'src', 'main', 'res', 'values', 'colors.xml')
    if not os.path.exists(colors_path):
        return
    with open(colors_path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Update ic_launcher_background to #FAFAF7
    content = re.sub(r'<color name="ic_launcher_background">#[0-9a-fA-F]+</color>',
                     '<color name="ic_launcher_background">#FAFAF7</color>', content)
    with open(colors_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched colors.xml ic_launcher_background.")

def patch_gradle():
    gradle_path = os.path.join('android', 'app', 'build.gradle')
    if not os.path.exists(gradle_path):
        return
    with open(gradle_path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'archivesBaseName' not in content:
        content = re.sub(r'(defaultConfig\s*\{)', r'\1\n        setProperty("archivesBaseName", "Recall")', content, count=1)
        with open(gradle_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched build.gradle archivesBaseName to Recall.")

if __name__ == '__main__':
    generate_icons()
    patch_manifest()
    patch_colors()
    patch_gradle()
