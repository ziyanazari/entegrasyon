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
    _, out, err = client.exec_command(cmd, timeout=300)
    o = (out.read()+err.read()).decode("utf-8","replace").strip()
    code = out.channel.recv_exit_status()
    if o: print(o.encode("ascii","replace").decode(), flush=True)
    print(f"EXIT: {code}", flush=True)

run("git pull", f"cd {DIR} && git pull origin main")
run("build", f"cd {DIR} && npm run build")
run("static", f"cd {DIR} && cp -rf public .next/standalone/public; cp -rf .next/static .next/standalone/.next/static; echo ok")
run("pm2 restart", f"cd {DIR} && pm2 restart ecosystem.config.js --update-env")
time.sleep(5)
run("pm2 status", "pm2 status")
run("son log", "pm2 logs ikas-entegrasyon --lines 5 --nostream")

client.close()
print("\nHOTFIX TAMAMLANDI! http://89.163.150.183:3000")
