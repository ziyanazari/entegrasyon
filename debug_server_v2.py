import paramiko

HOST = "89.163.150.183"
USER = "root"
PASS = "kTPDbf13ue"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
print("BAGLANTI OK", flush=True)

def run(cmd):
    _, out, err = client.exec_command(cmd)
    o = (out.read() + err.read()).decode("utf-8", "replace")
    # ASCII karakterlerine zorla (yazdıramayan karakterleri soru işareti yapar)
    print(o.encode("ascii", "replace").decode(), flush=True)

print("\n--- PM2 STATUS ---", flush=True)
run("pm2 status")
print("\n--- PM2 LOGS ---", flush=True)
run("pm2 logs ikas-entegrasyon --lines 50 --nostream")
print("\n--- PORT 3000 ---", flush=True)
run("netstat -tulnp | grep 3000")

client.close()
