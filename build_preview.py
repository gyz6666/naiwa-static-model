"""Build the standalone static viewer with Python 3's standard library.

The model file is read only. No network requests or packages are required.
"""
from pathlib import Path
import base64
import hashlib
import json
import re
import struct

ROOT = Path(__file__).resolve().parent


def module_uri(source):
    return 'data:text/javascript;base64,' + base64.b64encode(source.encode()).decode()


def build():
    model = (ROOT / 'naiwa-refined.glb').read_bytes()
    magic, version, total = struct.unpack_from('<III', model)
    if (magic, version, total) != (0x46546C67, 2, len(model)):
        raise ValueError('Expected a complete glTF 2.0 binary file')
    json_size = struct.unpack_from('<I', model, 12)[0]
    gltf = json.loads(model[20:20 + json_size])
    if gltf.get('animations') or gltf.get('skins'):
        raise ValueError('This preview release is for the static model only')

    imports = {
        'three/core': module_uri((ROOT / 'three.core.min.js').read_text()),
        'three': module_uri((ROOT / 'three.module.min.js').read_text().replace('./three.core.min.js', 'three/core')),
        'three/utils': module_uri((ROOT / 'BufferGeometryUtils.js').read_text()),
        'three/loader': module_uri((ROOT / 'GLTFLoader.js').read_text().replace('./BufferGeometryUtils.js', 'three/utils')),
    }
    html = (ROOT / 'viewer.template.html').read_text()
    html, count = re.subn(r'<script type="importmap">.*?</script>',
                         '<script type="importmap">' + json.dumps({'imports': imports}, separators=(',', ':')) + '</script>',
                         html, flags=re.S)
    if count != 1:
        raise ValueError('Expected exactly one import map in the template')
    javascript = (ROOT / 'viewer.js').read_text().replace("from './GLTFLoader.js'", "from 'three/loader'")
    marker = "const gltf=await new GLTFLoader().loadAsync('./naiwa-refined.glb');"
    if marker not in javascript:
        raise ValueError('Model load marker missing from viewer.js')
    javascript = javascript.replace(marker,
        "const bytes=Uint8Array.from(atob(document.querySelector('#embedded-model').textContent.trim()),c=>c.charCodeAt(0));"
        "const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');"
        "const download=document.querySelector('a.control[download]');"
        "download.href=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));download.download='naiwa-refined.glb';")
    html = html.replace('<script type="module" src="./viewer.js"></script>',
        '<script id="embedded-model" type="application/octet-stream">' + base64.b64encode(model).decode() + '</script>'
        '<script type="module">' + javascript + '</script>')
    html = html.replace('href="./naiwa-refined.glb"', 'href="#"')
    html = html.replace('<title>', '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E"><title>')
    model_hash = hashlib.sha256(model).hexdigest()
    html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="naiwa-model-sha256" content="' + model_hash + '">')
    (ROOT / 'index.html').write_text(html)

    filenames = ['naiwa-refined.blend', 'naiwa-refined.glb', 'index.html', 'front.png', 'side.png', 'back.png', 'three-quarter.png',
                 'viewer.js', 'viewer.template.html', 'build_preview.py', 'three.core.min.js', 'three.module.min.js', 'GLTFLoader.js',
                 'BufferGeometryUtils.js', 'README.md', 'LICENSE.md', 'LICENSE-CODE.txt', 'THREE-LICENSE.txt']
    manifest = {
        'version': '1.0.0', 'model_revision': '2026-10-15', 'kind': 'static_model',
        'model_sha256': model_hash, 'meshes': len(gltf.get('meshes', [])),
        'animation_clips': len(gltf.get('animations', [])), 'skins': len(gltf.get('skins', [])),
        'files': {name: {'bytes': (ROOT / name).stat().st_size, 'sha256': hashlib.sha256((ROOT / name).read_bytes()).hexdigest()} for name in filenames},
    }
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'model_sha256': model_hash, 'html_bytes': len(html.encode()), 'animations': 0, 'skins': 0}))


if __name__ == '__main__':
    build()
