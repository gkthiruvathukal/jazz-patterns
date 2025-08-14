import matplotlib.pyplot as plt
from datetime import date
import os

os.makedirs("out", exist_ok=True)

TITLE = "JAZZ SCALES"
SUBTITLE = "Practice Book"
LINE = "C instruments"
AUTHOR = "George K. Thiruvathukal, PhD"
ROLE = "Professor of Computer Science"
ORG = "Loyola University Chicago"
URL = "https://gkt.sh"

w, h = 8.5, 11
fig = plt.figure(figsize=(w, h))
ax = plt.axes([0, 0, 1, 1]); ax.set_xlim(0,1); ax.set_ylim(0,1); ax.axis("off")
ax.add_patch(plt.Rectangle((0,0),1,1,color="#0f1320"))

y0, gap = 0.64, 0.015
for i in range(5):
    ax.plot([0.08,0.92],[y0-i*gap,y0-i*gap],lw=2.2,color="#6b7796",alpha=0.55)
note_xs = [0.18,0.27,0.36,0.45,0.54]
note_ys = [y0-gap*0.5,y0-gap*1.5,y0-gap*1.0,y0-gap*2.0,y0-gap*1.5]
for x,y in zip(note_xs,note_ys):
    ax.add_patch(plt.Circle((x,y),0.012,color="#a4c2f4"))
ax.plot([note_xs[0]-0.01,note_xs[-1]+0.02],
        [note_ys[0]+0.035,note_ys[-1]+0.035], lw=6, color="#a4c2f4",alpha=0.85)

ax.text(0.08,0.78,TITLE,fontsize=46,weight="bold",color="#ecf1ff")
ax.text(0.08,0.73,SUBTITLE,fontsize=28,weight="bold",color="#aab8db")
ax.text(0.08,0.69,LINE,fontsize=16,color="#cbd5f0")

ax.text(0.08,0.235,AUTHOR,fontsize=18,weight="bold",color="#e7ecff")
ax.text(0.08,0.212,ROLE,fontsize=14,color="#cbd5f0")
ax.text(0.08,0.194,ORG,fontsize=14,color="#cbd5f0")
ax.text(0.08,0.172,URL,fontsize=13,color="#9fc0ff")

today = date.today().strftime("%B %d, %Y")
ax.text(0.08,0.14,f"Compiled {today}",fontsize=12,color="#9fb0d8")

ax.add_patch(plt.Rectangle((0,0.04),1,0.03,color="#24314b"))
fig.savefig("out/cover.pdf", format="pdf")
print("Wrote out/cover.pdf")

