import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: Number(process.env.PORT),
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
// Set EJS as the view engine
app.set("view engine", "ejs");

async function checkVisisted() {
  const result = await db.query("SELECT city_code FROM visited_cities");
  let cities = [];
  result.rows.forEach((city) => {
    cities.push(city.city_code);
  });
  return cities;
}

app.get("/", async (req, res) => {
  const cities = await checkVisisted();
  res.render("index.ejs", {
    cities: cities,
    total: cities.length,
    color: "#08c5cf",
  });
});

app.post("/act", async (req, res) => {
  const input = req.body["city"];
  const action = req.body["action"];
  try {
    const result = await db.query(
      "SELECT city_code FROM cities WHERE LOWER(city_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    const data = result.rows[0];

    if (data) {
      const cityCode = data.city_code;

      if (action === "add") {
        // Check if the city already exist
        const checkResult = await db.query(
          "SELECT * FROM visited_cities WHERE city_code = $1",
          [cityCode]
        );

        if (checkResult.rows.length > 0) {
          // City already exists
          res.render("index.ejs", {
            error: "City already visited.",
            color: "#08c5cf",
            cities: await checkVisisted(),
            total: (await checkVisisted()).length,
          });
        } else {
          // City does not exist, insert it
          try {
            await db.query(
              "INSERT INTO visited_cities (city_code) VALUES ($1)",
              [cityCode]
            );
            res.redirect("/");
          } catch (err) {
            console.log(err);
            res.status(500).send("Error inserting city.");
          }
        }
      } else if (action === "remove") {
        // Remove the city
        try {
          await db.query("DELETE FROM visited_cities WHERE city_code = $1", [
            cityCode,
          ]);
          res.redirect("/");
        } catch (err) {
          console.log(err);
          res.status(500).send("Error removing city.");
        }
      }
    } else {
      // City not found in the cities table
      res.render("index.ejs", {
        error: "City not found.",
        color: "#08c5cf",
        cities: await checkVisisted(),
        total: (await checkVisisted()).length,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error querying city.");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
