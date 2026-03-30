import paramiko

HOST = "89.163.150.183"
USER = "root"
PASS = "kTPDbf13ue"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
print("BAGLANTI OK")

def run(cmd):
    _, out, err = client.exec_command(cmd)
    o = (out.read() + err.read()).decode("utf-8", "replace")
    print(f"\n>>> {cmd}\n{o}")

run("pm2 status")
run("pm2 logs ikas-entegrasyon --lines 50 --nostream")
run("netstat -tulnp | grep 3000")

client.close()
