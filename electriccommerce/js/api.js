const API = "http://127.0.0.1:8000/api";
const headers = { "Content-Type": "application/json", "x-demo-token": "student1" };

async function api(path, opts = {}) {
  const res = await fetch(API + path, { headers, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Product images (same as before)
const productImages = {
  Refrigerator: "https://zlinekitchen.com/cdn/shop/products/zline--french--door--stainless--steel--standard--depth--refrigerator--RSM-W-36--side.jpg?v=1722276759&width=1946",
  Microwave: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6577/6577280_sd.jpg",
  Dishwasher: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/28f0ed55-0925-4cf5-92a1-cd8e15b2e4c3.jpg",
  Oven: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6401/6401963_sd.jpg",
  Washer: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRHFP8zaZVxIWcSWSVep64sTKkNXpAUwjc1r-JWgSiIzJec9AgcXtD14uslJUbgiucfnOhAmOkk44xkEKsKSMy_WHA9SAY4XXaflYq8lY1uWl7Wiy_1T6ktrIrGudNit0ONXFR5PDuJX9s&usqp=CAc",
  Dryer: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTxzQsvZ5-0y3nx6SmTdPYKqHtnKtUoNMSj27WSABnLIHa0S5rUf3alGypWsHDaEbFhLNdhJOa0uz023MbufcB7e1CImjm-e1jw7hnxunPdJBvaYymoL6uTNEZqUroAiYtVF1jd340dP4I&usqp=CAc",
  Blender: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6395/6395884_sd.jpg",
  DripCoffee: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6553/6553385_sd.jpg",
  Laptop: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/189f8d5b-03fe-4d49-aa2b-552018e1c819.jpg",
  TV: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/0343bc5e-db43-4664-8ef1-8a7255eae875.jpg",
  Speaker: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/db2aafd7-3ca3-48e3-a7fe-36714093bf8c.jpg",
  OutDatedVinyl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/a495cade-d7b5-4eb8-a36f-c378d3c29ec9.jpg",
  Switch2: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/2d2b885d-0b91-4a0a-b8e0-247fd2b26ab7.jpg",
  PlayStation5: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6601/6601524_sd.jpg",
  XboxS: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6470/6470289_sd.jpg",
  OutDatedGameBoy: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Game-Boy-FL.png",
  Headphones: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/4c7591bb-84b4-4697-b3a7-91ba2d6c83fa.jpg",
  IPad: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/2a76c272-cd12-43b9-ace9-34df9942ddd6.jpg",
  GamingDesktop: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/08c4770e-4f55-494e-a8ed-6604c87bef73.jpg",
  Printer: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/02d42d73-c9c2-4f3a-a964-6d7d37a9f574.jpg",
  Monitor: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6208cafc-fd04-4b29-89a5-4b431fde8df7.jpg",
  Camera: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6536/6536336_sd.jpg",
  SmartWatch: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/9ac5d1ec-3b32-4adb-a2f5-adc8b3c047e9.jpg",
  Vaccum: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/30d1d685-9631-4dcb-b24a-27211cc47de2.jpg"
};
