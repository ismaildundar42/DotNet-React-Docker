import { useEffect, useState } from "react";
import "./App.css";

type Product = {
  id: number;
  name: string;
  price: number;
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const loadProducts = async () => {
    const response = await fetch("http://localhost:5000/api/Products");
    const data = await response.json();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addProduct = async () => {
    if (!name || !price) return;

    await fetch("http://localhost:5000/api/Products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        price: Number(price),
      }),
    });

    setName("");
    setPrice("");

    await loadProducts();
  };

  const deleteProduct = async (id: number) => {
    await fetch(`http://localhost:5000/api/Products/${id}`, {
      method: "DELETE",
    });

    await loadProducts();
  };

  return (
    <div className="container">
      <h1>Docker Learning</h1>
      <p className="subtitle">React → .NET → SQL Server</p>

      <div className="form">
        <input
          placeholder="Ürün adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Fiyat"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <button onClick={addProduct}>Ürün Ekle</button>
      </div>

      <div className="products">
        {products.map((product) => (
          <div className="product" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <p>{product.price.toLocaleString("tr-TR")} TL</p>
            </div>

            <button
              className="delete"
              onClick={() => deleteProduct(product.id)}
            >
              Sil
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;