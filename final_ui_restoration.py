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
    if o: print(o.encode("ascii", "replace").decode(), flush=True)
    print(f"EXIT: {code}", flush=True)

run("git reset", f"cd {DIR} && git fetch --all && git reset --hard origin/main")
run("prisma db push", f"cd {DIR} && npx prisma db push")
run("prisma generate", f"cd {DIR} && npx prisma generate")
run("build", f"cd {DIR} && npm run build")
run("pm2 delete all", "pm2 delete all")
run("pm2 start ecosystem.config.js", f"cd {DIR} && pm2 start ecosystem.config.js")
time.sleep(5)
run("pm2 status", "pm2 status")
run("curl test", "curl -I http://localhost:3000")

client.close()
print("\nARAYUZ GUNCELLEMESI TAMAMLANDI!")
