document.addEventListener("DOMContentLoaded", () => {
  const channelsList = document.getElementById("channelsList");
  const addButton = document.getElementById("addButton");

  // جلب القنوات من الخادم وعرضها
  function loadChannels() {
    fetch("/channels")
      .then(response => response.json())
      .then(data => {
        channelsList.innerHTML = ""; // إفراغ القائمة قبل إضافتها
        data.channels.forEach(channel => {
          const li = document.createElement("li");

          // عرض القنوات مع إخفاء الروابط الأصلية
          li.innerHTML = `
            <strong>${channel.name}</strong>: 
            <a href="/${channel.name}" target="_blank">🔗 مشاهدة</a>
            <button onclick="deleteChannel('${channel.name}')">🗑️ حذف</button>
          `;
          channelsList.appendChild(li);
        });
      })
      .catch(error => console.error("❌ خطأ في تحميل القنوات:", error));
  }

  // حذف قناة
  window.deleteChannel = (channelName) => {
    fetch("/delete", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `name=${encodeURIComponent(channelName)}`
    }).then(() => loadChannels());
  };

  // إضافة قناة
  addButton.addEventListener("click", () => {
    const name = document.getElementById("channelName").value;
    const url = document.getElementById("channelURL").value;

    fetch("/add", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `name=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`
    }).then(() => {
      loadChannels();
      document.getElementById("channelName").value = "";
      document.getElementById("channelURL").value = "";
    });
  });

  // تحميل القنوات عند فتح الصفحة
  loadChannels();
});