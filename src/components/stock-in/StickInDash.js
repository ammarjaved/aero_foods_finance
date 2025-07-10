import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import Card from "react-bootstrap/Card";

function StockInDash({ data, materials }) {
  const [localMaterials, setLocalMaterials] = useState([]);
  const [categories, setCategories] = useState([]);

  const iconsList = {
    Equipment: { icon: "bi bi-gear" },
    Food: { icon: "bi bi-gear" },
    Operation: { icon: "bi bi-gear" },
    Packaging: { icon: "bi bi-gear" },
  };

  const getDistinctCategories = (data) => {
    const categoryCounts = new Map();

    data.forEach((item) => {
      const category = item.category;
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    });

    // Return as array of objects with category and count
    return Array.from(categoryCounts, ([category, count]) => ({
      category,
      count,
    }));
  };

  const handleCardClick = (item) => {
    console.log(item);
  };

  const organizeMaterials = () => {
    const categoriesWithCounts = getDistinctCategories(materials);
    setCategories(categoriesWithCounts);

    const distinctCategories = [
      ...new Set(materials.map((item) => item.category).filter(Boolean)),
    ];

    //console.log(distinctCategories);
  };
  useEffect(() => {
    setLocalMaterials(localMaterials);
    organizeMaterials();
    console.log(materials);
  }, [materials]);

  return (
    <div className="container-fluid">
      <div className="row">
        {categories &&
          categories.map((item, index) => (
            <div key={index} className="col-3" style={{ padding: 5 }}>
              <Button
                variant="outline-light"
                onClick={() => handleCardClick(item)}
              >
                <Card>
                  <Card.Header>
                 
                    <i
                      className={`${
                        iconsList[item.category]
                      } icon-highlight`}
                    ></i>
                  </Card.Header>
                  <Card.Body>
                    <Card.Title>{item.category}</Card.Title>
                    <Card.Text className="text-danger">
                      {item.count} Items are available in the Materials for the
                      {item.category} Category.
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Button>
            </div>
          ))}
      </div>
    </div>
  );
}

export default StockInDash;
