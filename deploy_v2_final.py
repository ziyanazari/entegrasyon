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
    _, out, err = client.exec_command(cmd, timeout=360)
    o = (out.read()+err.read()).decode("utf-8","replace").strip()
    code = out.channel.recv_exit_status()
    if o: print(o.encode("ascii","replace").decode(), flush=True)
    print(f"EXIT: {code}", flush=True)

# 1. Kodları çek
run("git pull", f"cd {DIR} && git pull origin main")

# 2. Veritabanı ve Prisma Client güncelle (schema degistigi icin sart)
run("prisma db push", f"cd {DIR} && npx prisma db push")
run("prisma generate", f"cd {DIR} && npx prisma generate")

# 3. Yeniden build al
run("build", f"cd {DIR} && npm run build")

# 4. Standalone dosyaları güncelle
run("static copy", f"cd {DIR} && cp -rf public .next/standalone/public; cp -rf .next/static .next/standalone/.next/static; echo 'Statik dosyalar kopyalandi'")

# 5. PM2 restart (Cron job'un devreye girmesi icin sart)
run("pm2 restart", f"cd {DIR} && pm2 restart ecosystem.config.js --update-env")
time.sleep(5)
run("pm2 status", "pm2 status")

client.close()
print("\nV2 OTOMASYON DEPLOY TAMAMLANDI!")
