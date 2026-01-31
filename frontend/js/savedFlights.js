const API = "http://localhost:3000";

// Load and display city pair routes in comparison table
async function loadCompareRoutes() {
    try {
        let res = await fetch(`${API}/routes`);
        let routes = await res.json();
        
        let tbody = document.getElementById("compare-routes-body");
        tbody.innerHTML = "";
        
        routes.forEach(route => {
            tbody.innerHTML += `
                <tr data-city-pair-id="route-${route.id}">
                    <td>
                        <input
                            type="checkbox"
                            class="compare-checkbox"
                            data-city-pair-id="route-${route.id}"
                        />
                    </td>
                    <td class="route-label">
                        <span class="route-origin">${route.origin}</span> → 
                        <span class="route-destination">${route.destination}</span>
                    </td>
                    <td class="route-airline">${route.airline}</td>
                    <td class="route-safety-score">${route.safety_score}</td>
                    <td class="route-co2">${route.co2_per_passenger} kg</td>
                    <td class="route-price">$${route.avg_price}</td>
                    <td class="route-ontime">${route.on_time}%</td>
                    <td>
                        <button
                            type="button"
                            class="remove-city-pair-btn"
                            onclick="removeRoute(${route.id})"
                            data-city-pair-id="route-${route.id}"
                            aria-label="Remove ${route.origin} to ${route.destination}"
                        >
                            ✕
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading routes:", error);
    }
}

// Remove a route from comparison
async function removeRoute(id) {
    try {
        await fetch(`${API}/routes/${id}`, { method: "DELETE" });
        loadCompareRoutes();
    } catch (error) {
        console.error("Error removing route:", error);
    }
}

// Compare selected routes
function compareSelected() {
    const checkboxes = document.querySelectorAll(".compare-checkbox:checked");
    
    if (checkboxes.length < 2) {
        alert("Please select at least 2 routes to compare");
        return;
    }
    
    const selectedRoutes = [];
    checkboxes.forEach(checkbox => {
        const row = checkbox.closest("tr");
        const routeData = {
            origin: row.querySelector(".route-origin").textContent,
            destination: row.querySelector(".route-destination").textContent,
            airline: row.querySelector(".route-airline").textContent,
            safety_score: parseFloat(row.querySelector(".route-safety-score").textContent),
            co2: parseFloat(row.querySelector(".route-co2").textContent),
            price: parseFloat(row.querySelector(".route-price").textContent.replace("$", "")),
            ontime: parseFloat(row.querySelector(".route-ontime").textContent)
        };
        selectedRoutes.push(routeData);
    });
    
    displayComparison(selectedRoutes);
}

// Display comparison results
function displayComparison(routes) {
    const metric = document.getElementById("compare-metric-select").value;
    const outputDiv = document.getElementById("compare-output");
    
    let comparisonHTML = '<div class="comparison-results"><h3>Comparison Results</h3>';
    
    routes.forEach(route => {
        let metricValue;
        let metricLabel;
        
        switch(metric) {
            case "safety_score":
                metricValue = route.safety_score;
                metricLabel = "Safety Score";
                break;
            case "co2_per_passenger":
                metricValue = route.co2 + " kg";
                metricLabel = "CO₂ per Passenger";
                break;
            case "avg_price":
                metricValue = "$" + route.price;
                metricLabel = "Average Price";
                break;
            case "on_time":
                metricValue = route.ontime + "%";
                metricLabel = "On-time Performance";
                break;
        }
        
        comparisonHTML += `
            <div class="comparison-card">
                <h4>${route.origin} → ${route.destination}</h4>
                <p><strong>Airline:</strong> ${route.airline}</p>
                <p class="comparison-metric">
                    <strong>${metricLabel}:</strong> ${metricValue}
                </p>
            </div>
        `;
    });
    
    comparisonHTML += '</div>';
    outputDiv.innerHTML = comparisonHTML;
}

// Event listeners
document.addEventListener("DOMContentLoaded", function() {
    loadCompareRoutes();
    
    const compareBtn = document.getElementById("compare-selected-btn");
    if (compareBtn) {
        compareBtn.addEventListener("click", compareSelected);
    }
});