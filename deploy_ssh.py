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
    _, out, err = client.exec_command(f"cd {DIR} && {cmd}", timeout=300)
    o = out.read().decode("utf-8", "replace").strip()
    code = out.channel.recv_exit_status()
    if o: print(o.encode("ascii","replace").decode(), flush=True)
    print(f"EXIT: {code}", flush=True)
    return code

run("1 git stash+pull", "git stash && git pull origin main")
run("2 npm install", "npm install")

sftp = client.open_sftp()
with sftp.open("/var/www/entegrasyon/.env", "w") as f:
    f.write('DATABASE_URL="file:/var/www/entegrasyon/prisma/dev.db"\n')
sftp.close()
print(">>> .env DATABASE_URL yazildi", flush=True)

run("3 prisma generate", "npx prisma generate")
run("3 prisma db push", "npx prisma db push")
run("4 build", "npm run build")
run("5 static", "cp -rf public .next/standalone/public; cp -rf .next/static .next/standalone/.next/static; echo ok")
run("6 pm2 restart", "pm2 restart ecosystem.config.js --update-env")
run("pm2 status", "pm2 status")
client.close()
print("\nDEPLOY TAMAMLANDI! http://89.163.150.183:3000")
