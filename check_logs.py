import paramiko

HOST = "89.163.150.183"
USER = "root"
PASS = "kTPDbf13ue"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

_, out, err = client.exec_command("pm2 logs --lines 100 --nostream")
log_content = (out.read() + err.read()).decode("utf-8", "replace")
print(log_content.encode("ascii", "replace").decode())

client.close()
