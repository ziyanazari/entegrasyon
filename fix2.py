import paramiko, time

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
    _, out, err = client.exec_command(cmd, timeout=60)
    o = (out.read()+err.read()).decode("utf-8","replace").strip()
    code = out.channel.recv_exit_status()
    if o: print(o.encode("ascii","replace").decode(), flush=True)
    print(f"EXIT: {code}", flush=True)
    return code

# ecosystem.config.js duzelt - script node olmali, cwd altinda tam path
eco = """module.exports = {
  apps: [
    {
      name: "ikas-entegrasyon",
      script: "/var/www/entegrasyon/.next/standalone/server.js",
      cwd: "/var/www/entegrasyon/.next/standalone",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        DATABASE_URL: "file:/var/www/entegrasyon/prisma/dev.db",
        IKAS_CLIENT_ID: "aca033be-2f8e-4721-9eb0-ac6c8d284279",
        IKAS_CLIENT_SECRET: "s_lnNkiLeKa62advxYbGx4lHUC45886ac0e63c485e867fe1d6bc7cb26e",
        IKAS_STORE_NAME: "ebijuteri",
        AUTH_SECRET: "89e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8",
        ADMIN_USER: "admin",
        ADMIN_PASS: "admin123"
      }
    }
  ]
};
"""

sftp = client.open_sftp()
with sftp.open(DIR + "/ecosystem.config.js", "w") as f:
    f.write(eco)
sftp.close()
print(">>> ecosystem.config.js duzeltildi", flush=True)

# PM2 delete + start (temiz baslat)
run("pm2 delete", "pm2 delete ikas-entegrasyon")
run("pm2 start", f"cd {DIR} && pm2 start ecosystem.config.js")
time.sleep(5)
run("pm2 status", "pm2 status")
run("port 3000", "ss -tlnp | grep 3000")
run("son log", "pm2 logs ikas-entegrasyon --lines 10 --nostream")

client.close()
print("\nTAMAMLANDI! http://89.163.150.183:3000")
