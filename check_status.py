import paramiko

HOST = "89.163.150.183"
USER = "root"
PASS = "kTPDbf13ue"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
print("BAGLANTI OK")

_, out, err = client.exec_command("pm2 status")
print(out.read().decode("utf-8","replace"))

client.close()
