import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Circle, Rectangle
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(14, 10))
ax.set_xlim(0, 14)
ax.set_ylim(0, 10)
ax.axis('off')

# Title
ax.text(7, 9.5, 'Network Topology Diagram', fontsize=20, fontweight='bold', ha='center', color='#1a1a2e')
ax.text(7, 9.1, 'Home/Small Office LAN - Star Topology', fontsize=12, ha='center', color='#555')

# Central Router (Star center)
router_box = FancyBboxPatch((5.5, 4.5), 3, 1.5, boxstyle="round,pad=0.05,rounding_size=0.2",
                             facecolor='#e74c3c', edgecolor='#c0392b', linewidth=2)
ax.add_patch(router_box)
ax.text(7, 5.55, 'Wireless Router', fontsize=11, fontweight='bold', ha='center', color='white')
ax.text(7, 5.15, '(Mi Router / TP-Link)', fontsize=9, ha='center', color='white')
ax.text(7, 4.8, 'Gateway: 192.168.31.1', fontsize=8, ha='center', color='#ffeaa7', family='monospace')

# Internet Cloud (top)
cloud = mpatches.Ellipse((7, 7.5), 2.5, 1.2, facecolor='#3498db', edgecolor='#2980b9', linewidth=2)
ax.add_patch(cloud)
ax.text(7, 7.5, 'Internet', fontsize=11, fontweight='bold', ha='center', color='white')
ax.text(7, 7.2, 'ISP Connection', fontsize=8, ha='center', color='#dfe6e9')

# Internet to Router line
ax.annotate('', xy=(7, 6.0), xytext=(7, 6.9),
            arrowprops=dict(arrowstyle='->', color='#2c3e50', lw=2))
ax.text(7.6, 6.45, 'WAN Link', fontsize=8, color='#2c3e50')

# Device positions around the router
devices = [
    {'name': 'Laptop (This PC)', 'ip': '192.168.31.182', 'mac': '8C-B0-E9-5C-67-5E', 'type': 'wireless', 'pos': (2, 3)},
    {'name': 'Smartphone', 'ip': '192.168.31.x', 'mac': 'xx-xx-xx-xx-xx-xx', 'type': 'wireless', 'pos': (12, 3)},
    {'name': 'Smart TV', 'ip': '192.168.31.x', 'mac': 'xx-xx-xx-xx-xx-xx', 'type': 'wireless', 'pos': (2, 6.5)},
    {'name': 'Printer', 'ip': '192.168.31.x', 'mac': 'xx-xx-xx-xx-xx-xx', 'type': 'wireless', 'pos': (12, 6.5)},
]

colors = {'wireless': '#9b59b6', 'wired': '#27ae60'}

for dev in devices:
    x, y = dev['pos']
    # Device box
    dev_box = FancyBboxPatch((x-1.2, y-0.6), 2.4, 1.2, boxstyle="round,pad=0.03,rounding_size=0.15",
                              facecolor=colors[dev['type']], edgecolor='#2c3e50', linewidth=1.5, alpha=0.9)
    ax.add_patch(dev_box)
    ax.text(x, y+0.25, dev['name'], fontsize=9, fontweight='bold', ha='center', color='white')
    ax.text(x, y-0.05, f"IP: {dev['ip']}", fontsize=7, ha='center', color='#ecf0f1', family='monospace')
    ax.text(x, y-0.3, f"MAC: {dev['mac']}", fontsize=6.5, ha='center', color='#dfe6e9', family='monospace')
    
    # Connection line to router
    if dev['type'] == 'wireless':
        ax.annotate('', xy=(7, 5.2), xytext=(x, y+0.6),
                    arrowprops=dict(arrowstyle='-', color='#9b59b6', lw=1.5, linestyle='--'))
        # Wi-Fi symbol
        mid_x, mid_y = (x + 7) / 2, (y + 0.6 + 5.2) / 2
        ax.text(mid_x+0.3, mid_y, 'Wi-Fi', fontsize=7, color='#9b59b6', style='italic')
    else:
        ax.annotate('', xy=(7, 5.2), xytext=(x, y+0.6),
                    arrowprops=dict(arrowstyle='-', color='#27ae60', lw=1.5))

# Legend
legend_elements = [
    mpatches.Patch(facecolor='#e74c3c', edgecolor='#c0392b', label='Router/Gateway'),
    mpatches.Patch(facecolor='#9b59b6', edgecolor='#2c3e50', label='Wireless Device (Wi-Fi)'),
    mpatches.Patch(facecolor='#3498db', edgecolor='#2980b9', label='Internet/ISP'),
    plt.Line2D([0], [0], color='#9b59b6', lw=1.5, linestyle='--', label='Wireless Connection'),
]
ax.legend(handles=legend_elements, loc='lower center', bbox_to_anchor=(0.5, -0.05),
          ncol=4, fontsize=9, frameon=True, fancybox=True)

# Network info box
info_box = FancyBboxPatch((0.3, 0.3), 4, 1.8, boxstyle="round,pad=0.02,rounding_size=0.1",
                           facecolor='#f8f9fa', edgecolor='#ced4da', linewidth=1)
ax.add_patch(info_box)
ax.text(2.3, 1.85, 'Network Details', fontsize=10, fontweight='bold', ha='center', color='#1a1a2e')
ax.text(0.5, 1.5, 'Topology Type:', fontsize=8, fontweight='bold', color='#2c3e50')
ax.text(2.0, 1.5, 'Star Topology', fontsize=8, color='#27ae60')
ax.text(0.5, 1.2, 'SSID:', fontsize=8, fontweight='bold', color='#2c3e50')
ax.text(2.0, 1.2, 'राधे राधे', fontsize=8, color='#9b59b6')
ax.text(0.5, 0.9, 'Wi-Fi Standard:', fontsize=8, fontweight='bold', color='#2c3e50')
ax.text(2.0, 0.9, '802.11ax (Wi-Fi 6)', fontsize=8, color='#9b59b6')
ax.text(0.5, 0.6, 'Subnet:', fontsize=8, fontweight='bold', color='#2c3e50')
ax.text(2.0, 0.6, '192.168.31.0/24', fontsize=8, color='#e74c3c', family='monospace')

# Speed info box
speed_box = FancyBboxPatch((9.7, 0.3), 4, 1.8, boxstyle="round,pad=0.02,rounding_size=0.1",
                            facecolor='#f8f9fa', edgecolor='#ced4da', linewidth=1)
ax.add_patch(speed_box)
ax.text(11.7, 1.85, 'Connection Speeds', fontsize=10, fontweight='bold', ha='center', color='#1a1a2e')
ax.text(10.0, 1.5, 'Wireless LAN:', fontsize=8, fontweight='bold', color='#2c3e50')
ax.text(11.8, 1.5, '~286.8 Mbps', fontsize=8, color='#9b59b6')
ax.text(10.0, 1.2, 'Wired LAN:', fontsize=8, fontweight='bold', color='#2c3e50')
ax.text(11.8, 1.2, 'Not Connected', fontsize=8, color='#7f8c8d')
ax.text(10.0, 0.9, 'Router Capacity:', fontsize=8, fontweight='bold', color='#2c3e50')
ax.text(11.8, 0.9, 'Up to 1 Gbps', fontsize=8, color='#27ae60')
ax.text(10.0, 0.6, 'Band:', fontsize=8, fontweight='bold', color='#2c3e50')
ax.text(11.8, 0.6, '2.4 GHz', fontsize=8, color='#9b59b6')

plt.tight_layout()
plt.savefig('network_topology.png', dpi=200, bbox_inches='tight', facecolor='white')
print("Diagram saved as network_topology.png")
