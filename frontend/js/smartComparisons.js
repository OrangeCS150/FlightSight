document.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const groups = document.getElementById('groups');
    const groupList = document.getElementById('group-list');
    const comparison = document.getElementById('comparison');
    const comparisonContent = document.getElementById('comparison-content');
    const emptyState = document.getElementById('empty-state');

    function showLoading() {
        loading.classList.remove('d-none');
        error.classList.add('d-none');
        groups.classList.add('d-none');
        comparison.classList.add('d-none');
        emptyState.classList.add('d-none');
    }

    function showError(msg) {
        error.textContent = msg;
        error.classList.remove('d-none');
        loading.classList.add('d-none');
    }

    function showGroups(groupData) {
        if (groupData.length === 0) {
            emptyState.classList.remove('d-none');
            loading.classList.add('d-none');
            return;
        }
        groupList.innerHTML = groupData.map(g => `
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${g.origin} to ${g.destination} on ${g.departureDate}</h5>
                        <p class="card-text">Airlines: ${g.airlines.join(', ')}</p>
                        <button class="btn btn-primary" onclick="loadComparison('${g.tripKey}')">Compare</button>
                    </div>
                </div>
            </div>
        `).join('');
        groups.classList.remove('d-none');
        loading.classList.add('d-none');
    }

    function showComparison(data) {
        const best = data.bestFlight;
        comparisonContent.innerHTML = `
            <div class="card mb-3 border-success">
                <div class="card-body">
                    <h4 class="card-title">Best Airline: ${best.airline}</h4>
                    <p class="card-text">${data.reason}</p>
                    <p class="card-text">Confidence: ${(data.confidence * 100).toFixed(0)}%</p>
                </div>
            </div>
            <div class="row">
                ${data.flights.map(f => `
                    <div class="col-md-6 mb-3">
                        <div class="card ${f.id === best.id ? 'border-success' : ''}">
                            <div class="card-body">
                                <h5 class="card-title">${f.airline}</h5>
                                <p class="card-text">Price: $${f.price}</p>
                                <p class="card-text">Duration: ${f.duration} min</p>
                                <p class="card-text">Stops: ${f.stops}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        comparison.classList.remove('d-none');
        groups.classList.add('d-none');
    }

    window.loadComparison = async (groupId) => {
        showLoading();
        try {
            const res = await fetch(`/api/smart-comparisons/${groupId}`);
            const data = await res.json();
            if (data.error) {
                showError(data.error);
            } else {
                showComparison(data);
            }
        } catch (err) {
            showError('Failed to load comparison');
        }
    };

    // Load groups on page load, try real first, fallback to demo
    showLoading();
    fetch('/api/smart-comparisons')
        .then(res => res.json())
        .then(data => {
            if (data.groups && data.groups.length > 0) {
                showGroups(data.groups);
            } else {
                // Fallback to demo
                return fetch('/api/smart-comparisons/demo');
            }
        })
        .then(res => res ? res.json() : null)
        .then(demoData => {
            if (demoData && demoData.groups) {
                showGroups(demoData.groups);
            } else {
                showError('No data available');
            }
        })
        .catch(() => showError('Failed to load groups'));
});
