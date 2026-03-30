import paramiko

HOST = "89.163.150.183"
USER = "root"  
PASS = "kTPDbf13ue"
DIR  = "/var/www/entegrasyon"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
print("BAGLANTI OK", flush=True)

def run(desc, cmd):
    print(f"\n>>> {desc}", flush=True)
    _, out, err = client.exec_command(cmd, timeout=300)
    o = (out.read() + err.read()).decode("utf-8", "replace").strip()
    code = out.channel.recv_exit_status()
    if o: print(o.encode("ascii","replace").decode(), flush=True)
    print(f"EXIT: {code}", flush=True)
    return code

# next.config.ts duzelt
cfg = 'import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {\n  output: "standalone",\n  typescript: { ignoreBuildErrors: true },\n};\n\nexport default nextConfig;\n'
sftp = client.open_sftp()
with sftp.open(DIR + "/next.config.ts", "w") as f:
    f.write(cfg)
sftp.close()
print(">>> next.config.ts duzeltildi", flush=True)

run("git add+commit next.config.ts", f"cd {DIR} && git add next.config.ts && git commit -m 'fix: remove invalid eslint config key' || echo 'no changes'")
run("build", f"cd {DIR} && npm run build")
run("static", f"cd {DIR} && cp -rf public .next/standalone/public; cp -rf .next/static .next/standalone/.next/static; echo ok")
run("server.js var mi", f"ls {DIR}/.next/standalone/")
run("pm2 restart", f"cd {DIR} && pm2 restart ecosystem.config.js --update-env")
run("pm2 durum", "pm2 status")
run("port 3000", "ss -tlnp | grep 3000")

client.close()
print("\nTAMAMLANDI! http://89.163.150.183:3000")
