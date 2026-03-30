import paramiko

HOST = "89.163.150.183"
USER = "root"
PASS = "kTPDbf13ue"
DIR  = "/var/www/entegrasyon"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    _, out, err = client.exec_command(cmd)
    o = (out.read() + err.read()).decode("utf-8", "replace")
    print(o.encode("ascii", "replace").decode())

print("\n--- FIND STANDALONE ---")
run(f"find {DIR} -name server.js")

client.close()
