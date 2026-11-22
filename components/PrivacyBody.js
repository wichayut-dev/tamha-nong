"use client";
// เนื้อหานโยบายความเป็นส่วนตัว 4 ภาษา (ฉบับภาษาไทยเป็นฉบับหลัก)
import Link from "next/link";
import { getLang, t } from "@/lib/i18n";

const C = {
  th: {
    updated: "ปรับปรุงล่าสุด 13 พฤศจิกายน 2569",
    lead: "ตามหาน้อง ภูเก็ต เป็นโปรเจกต์ชุมชนที่ไม่แสวงหากำไร เราเก็บข้อมูลเท่าที่จำเป็นต่อการช่วยให้สัตว์เลี้ยงได้กลับบ้าน และไม่ขายหรือส่งต่อข้อมูลให้ใคร ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)",
    s: [
      ["1. ข้อมูลที่เราเก็บ", [
        ["ข้อมูลในประกาศ", "รูปสัตว์ รูปสถานที่ ลักษณะ พื้นที่ จุดที่ปักหมุด เวลาที่หายหรือพบ และรางวัล"],
        ["ข้อมูลติดต่อ", "เบอร์โทร และ (ถ้ากรอก) ชื่อผู้ติดต่อกับ LINE ID"],
        ["การแจ้งว่าเห็นสัตว์", "พื้นที่ จุดที่ปักหมุด เวลา ข้อความ และรูป (ไม่ต้องใส่ชื่อหรือเบอร์)"],
        ["ข้อมูลทางเทคนิค", "หมายเลข IP แบบชั่วคราว ใช้จำกัดจำนวนการส่งเพื่อกันสแปม และลบอัตโนมัติ"],
      ], ["เราไม่ใช้คุกกี้โฆษณาหรือระบบติดตามผู้ใช้ รหัสแก้ไขประกาศและภาษาที่เลือกเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น"]],
      ["2. เราใช้ข้อมูลทำอะไร", [
        [null, "แสดงประกาศให้คนในภูเก็ตเห็น เพื่อให้คนที่พบสัตว์ติดต่อเจ้าของได้"],
        [null, "แสดงจุดที่หายหรือพบบนแผนที่ และนำทางผ่าน Google Maps"],
        [null, "ป้องกันสแปม ประกาศปลอม และการใช้งานในทางที่ผิด"],
      ]],
      ["3. ใครเห็นข้อมูลของคุณ", null, [
        ["!ทุกคนที่เปิดเว็บจะเห็นข้อมูลในประกาศ รวมถึงเบอร์โทร", " เพราะเป็นช่องทางให้คนติดต่อคุณ กรุณาอย่าใส่ข้อมูลที่ไม่อยากเปิดเผย เช่น บ้านเลขที่ ไม่จำเป็นต้องปักหมุดที่บ้านของคุณ ปักแค่จุดที่สัตว์หายก็พอ"],
        "ผู้ดูแลระบบเห็นรายงานประกาศไม่เหมาะสม และแก้ไขหรือซ่อนประกาศได้ ข้อมูลเก็บบน Supabase (ศูนย์ข้อมูลสิงคโปร์) แผนที่ใช้ OpenStreetMap",
        "เมื่อเลือกภาษาอื่นที่ไม่ใช่ไทย ข้อความในประกาศ (ชื่อน้อง ลักษณะ ค่าตอบแทน ข้อความแจ้งเห็น) จะถูกส่งไปแปลอัตโนมัติผ่านบริการ MyMemory โดยไม่ส่งเบอร์โทรหรือชื่อผู้ติดต่อ",
      ]],
      ["4. เก็บนานแค่ไหน", null, ["ประกาศที่เกิน 60 วันจะไม่แสดงในหน้าเว็บอัตโนมัติ เจ้าของลบประกาศได้ตลอดเวลาจากเบราว์เซอร์ที่ใช้ลงประกาศ และเราจะลบข้อมูลถาวรเมื่อได้รับคำขอ"]],
      ["5. สิทธิของคุณ", null, [
        "คุณขอดู แก้ไข หรือลบข้อมูลของคุณได้ ถ้าลบเองไม่ได้ (เช่น เปลี่ยนมือถือ) ให้กด “แจ้งโพสต์ไม่เหมาะสม” ในหน้าประกาศแล้วเขียนว่าขอลบ หรือติดต่อผู้ดูแล เราจะดำเนินการภายใน 7 วัน",
        "ถ้ามีคนนำเบอร์โทรหรือรูปของคุณไปลงโดยไม่ได้รับอนุญาต แจ้งเราได้ทันที",
      ]],
      ["6. ติดต่อ", null, ["ผู้ดูแลระบบ ตามหาน้อง ภูเก็ต: กดปุ่ม “แจ้งโพสต์ไม่เหมาะสม” ในหน้าประกาศใดก็ได้ ข้อความจะส่งถึงผู้ดูแลโดยตรง"]],
    ],
  },
  en: {
    updated: "Last updated 13 November 2026",
    lead: "Tamha Nong Phuket is a non-profit community project. We collect only what is needed to help pets get home, and we never sell or share your data, in line with Thailand's Personal Data Protection Act B.E. 2562 (PDPA). The Thai version of this policy is the official one.",
    s: [
      ["1. What we collect", [
        ["Post details", "photos of the pet and the place, description, area, pinned location, when it was lost or found, and any reward"],
        ["Contact details", "phone number and, if provided, a contact name and LINE ID"],
        ["Sighting reports", "area, pinned location, time, message and photo (no name or phone needed)"],
        ["Technical data", "a temporary IP address, used only for rate limits against spam and deleted automatically"],
      ], ["We don't use advertising cookies or tracking. Your edit code and chosen language are stored only in your own browser."]],
      ["2. How we use it", [
        [null, "To show posts to people in Phuket so whoever finds a pet can contact the owner"],
        [null, "To show where pets were lost or found on the map, with directions via Google Maps"],
        [null, "To prevent spam, fake posts and abuse"],
      ]],
      ["3. Who can see your data", null, [
        ["!Everyone who visits the site can see the details in a post, including the phone number,", " because that is how people contact you. Please don't include anything you don't want public, such as your house number. You don't need to pin your home; the spot where the pet went missing is enough."],
        "Admins can see reports about inappropriate posts and can edit or hide posts. Data is stored on Supabase (Singapore data centre). Maps use OpenStreetMap.",
        "When you choose a language other than Thai, post text (pet name, description, reward, sighting notes) is sent to the MyMemory service for automatic translation. Phone numbers and contact names are not sent.",
      ]],
      ["4. How long we keep it", null, ["Posts older than 60 days are hidden from the site automatically. Owners can delete their post at any time from the browser they posted with, and we permanently delete data on request."]],
      ["5. Your rights", null, [
        "You can ask to see, correct or delete your data. If you can't delete it yourself (e.g. you changed phones), tap “Report inappropriate post” on the post and ask for deletion, or contact the admin. We will act within 7 days.",
        "If someone posted your phone number or photo without permission, let us know right away.",
      ]],
      ["6. Contact", null, ["Tamha Nong Phuket admin: Tap “Report inappropriate post” on any post page and your message goes directly to the admin."]],
    ],
  },
  zh: {
    updated: "最后更新：2026年11月13日",
    lead: "ตามหาน้อง ภูเก็ต 是一个非营利社区项目。我们只收集帮助宠物回家所必需的信息，绝不出售或向任何人提供你的数据，并遵守泰国《2019年个人数据保护法》（PDPA）。本政策以泰文版为准。",
    s: [
      ["1. 我们收集哪些信息", [
        ["启事信息", "宠物照片、地点照片、特征、区域、标记位置、走失或发现时间，以及酬谢"],
        ["联系方式", "电话号码，以及（如填写）联系人姓名和 LINE ID"],
        ["目击报告", "区域、标记位置、时间、留言和照片（无需填写姓名或电话）"],
        ["技术信息", "临时 IP 地址，仅用于限制提交次数以防垃圾信息，会自动删除"],
      ], ["我们不使用广告 Cookie 或用户追踪。启事编辑码和所选语言只保存在你自己的浏览器中。"]],
      ["2. 我们如何使用信息", [
        [null, "向普吉岛的人展示启事，让捡到宠物的人能联系主人"],
        [null, "在地图上显示走失或发现地点，并可通过 Google 地图导航"],
        [null, "防止垃圾信息、虚假启事和滥用"],
      ]],
      ["3. 谁能看到你的信息", null, [
        ["!所有访问网站的人都能看到启事中的信息，包括电话号码，", "因为这是别人联系你的方式。请不要填写不想公开的信息，例如门牌号。不需要标记你家，只需标记宠物走失的地点。"],
        "管理员可以查看不当启事的举报，并可编辑或隐藏启事。数据存储在 Supabase（新加坡数据中心），地图使用 OpenStreetMap。",
        "选择泰语以外的语言时，启事中的文字（宠物名字、特征、酬谢、目击留言）会发送到 MyMemory 服务进行自动翻译，不会发送电话号码或联系人姓名。",
      ]],
      ["4. 保存多久", null, ["超过 60 天的启事会自动从网站隐藏。主人可随时在发布时使用的浏览器中删除启事，收到请求后我们也会永久删除数据。"]],
      ["5. 你的权利", null, [
        "你可以要求查看、更正或删除你的数据。如果无法自行删除（例如换了手机），请在启事页面点“举报不当启事”并注明要求删除，或联系管理员。我们会在 7 天内处理。",
        "如果有人未经允许发布了你的电话号码或照片，请立即告诉我们。",
      ]],
      ["6. 联系我们", null, ["ตามหาน้อง ภูเก็ต 管理员: 在任意启事页面点“举报不当启事”，留言会直接发送给管理员。"]],
    ],
  },
  ru: {
    updated: "Обновлено 13 ноября 2026 г.",
    lead: "ตามหาน้อง ภูเก็ต — некоммерческий общественный проект. Мы собираем только то, что нужно, чтобы помочь питомцам вернуться домой, и никому не продаём и не передаём ваши данные — в соответствии с тайским Законом о защите персональных данных 2019 г. (PDPA). Официальной является тайская версия политики.",
    s: [
      ["1. Какие данные мы собираем", [
        ["Данные объявления", "фото питомца и места, приметы, район, отмеченная точка, время пропажи или находки, вознаграждение"],
        ["Контакты", "номер телефона и, если указаны, имя и LINE ID"],
        ["Сообщения «видели»", "район, отмеченная точка, время, текст и фото (имя и телефон не нужны)"],
        ["Технические данные", "временный IP-адрес — только для ограничения частоты отправки против спама, удаляется автоматически"],
      ], ["Мы не используем рекламные cookie и не отслеживаем пользователей. Код редактирования и выбранный язык хранятся только в вашем браузере."]],
      ["2. Как мы используем данные", [
        [null, "Показываем объявления жителям Пхукета, чтобы нашедший питомца мог связаться с владельцем"],
        [null, "Показываем места пропажи и находки на карте с маршрутом через Google Maps"],
        [null, "Защищаемся от спама, фальшивых объявлений и злоупотреблений"],
      ]],
      ["3. Кто видит ваши данные", null, [
        ["!Все посетители сайта видят данные объявления, включая номер телефона,", " потому что так с вами смогут связаться. Не указывайте то, что не хотите раскрывать, например номер дома. Не нужно отмечать свой дом — достаточно места, где пропал питомец."],
        "Администраторы видят жалобы на объявления и могут редактировать или скрывать их. Данные хранятся в Supabase (дата-центр в Сингапуре), карты — OpenStreetMap.",
        "Если выбран не тайский язык, текст объявлений (кличка, приметы, вознаграждение, сообщения «видели») отправляется в сервис MyMemory для автоматического перевода. Телефоны и имена для связи не отправляются.",
      ]],
      ["4. Как долго мы храним данные", null, ["Объявления старше 60 дней автоматически скрываются с сайта. Владелец может удалить объявление в любое время из браузера, с которого его подал, а по запросу мы удаляем данные навсегда."]],
      ["5. Ваши права", null, [
        "Вы можете запросить просмотр, исправление или удаление своих данных. Если не получается удалить самостоятельно (например, сменили телефон), нажмите «Пожаловаться на объявление» на странице объявления и попросите удалить его, или свяжитесь с администратором. Мы ответим в течение 7 дней.",
        "Если кто-то опубликовал ваш телефон или фото без разрешения, сразу сообщите нам.",
      ]],
      ["6. Контакты", null, ["Администратор ตามหาน้อง ภูเก็ต: Нажмите «Пожаловаться на объявление» на любой странице объявления — сообщение придёт администратору напрямую."]],
    ],
  },
};

function Para({ p }) {
  if (Array.isArray(p)) return <p><b>{p[0].slice(1)}</b>{p[1]}</p>;
  return <p>{p}</p>;
}

export default function PrivacyBody() {
  const c = C[getLang()] || C.th;
  return (
    <article className="legal">
      <span className="eyebrow">{c.updated}</span>
      <h1>{t("privacy_policy")}</h1>
      <p className="lead">{c.lead}</p>
      {c.s.map(([title, items, paras]) => (
        <section key={title}>
          <h2>{title}</h2>
          {items && (
            <ul>
              {items.map(([b, text], i) => <li key={i}>{b ? <><b>{b}</b> {text}</> : text}</li>)}
            </ul>
          )}
          {paras?.map((p, i) => <Para key={i} p={p} />)}
        </section>
      ))}
      <p className="meta"><Link href="/" className="inline-link">{t("back_home")}</Link></p>
    </article>
  );
}
