// Global variables
let items = [
    { id: 1, weight: 2, value: 3 },
    { id: 2, weight: 3, value: 4 },
    { id: 3, weight: 4, value: 5 },
    { id: 4, weight: 5, value: 6 }
];
let capacity = 8;
let dpTable = [];
let currentRow = 0;
let currentCol = 0;
let selectedItems = [];
let isComplete = false;
let isAnimating = false;
let animationTimeout = null;
const ANIMATION_SPEED = 500;

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the form with default items
    renderItemInputs();
    
    // Event listeners
    document.getElementById('addItemBtn').addEventListener('click', addItem);
    document.getElementById('knapsackForm').addEventListener('submit', initializeVisualization);
    document.getElementById('resetBtn').addEventListener('click', reset);
    document.getElementById('animateBtn').addEventListener('click', toggleAnimation);
});

// Render item input fields
function renderItemInputs() {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = '<p class="text-muted small">No items added yet. Click "Add Item" to begin.</p>';
        return;
    }
    
    // Header row
    const headerRow = document.createElement('div');
    headerRow.className = 'row mb-2';
    headerRow.innerHTML = `
        <div class="col-5"><span class="small text-muted">Weight</span></div>
        <div class="col-5"><span class="small text-muted">Value</span></div>
        <div class="col-2"></div>
    `;
    container.appendChild(headerRow);
    
    // Item rows
    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'row mb-2 align-items-center';
        row.innerHTML = `
            <div class="col-5">
                <input type="number" class="form-control form-control-sm item-weight" 
                       data-id="${item.id}" min="1" value="${item.weight}">
            </div>
            <div class="col-5">
                <input type="number" class="form-control form-control-sm item-value" 
                       data-id="${item.id}" min="1" value="${item.value}">
            </div>
            <div class="col-2">
                <button type="button" class="btn btn-outline-danger btn-sm delete-item" 
                        data-id="${item.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(row);
    });
    
    // Add event listeners to the new elements
    document.querySelectorAll('.item-weight').forEach(input => {
        input.addEventListener('change', updateItemWeight);
    });
    
    document.querySelectorAll('.item-value').forEach(input => {
        input.addEventListener('change', updateItemValue);
    });
    
    document.querySelectorAll('.delete-item').forEach(button => {
        button.addEventListener('click', deleteItem);
    });
}

// Add a new item
function addItem() {
    const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    items.push({ id: newId, weight: 1, value: 1 });
    renderItemInputs();
}

// Update item weight
function updateItemWeight(event) {
    const id = parseInt(event.target.dataset.id);
    const weight = parseInt(event.target.value) || 1;
    items = items.map(item => item.id === id ? { ...item, weight } : item);
}

// Update item value
function updateItemValue(event) {
    const id = parseInt(event.target.dataset.id);
    const value = parseInt(event.target.value) || 1;
    items = items.map(item => item.id === id ? { ...item, value } : item);
}

// Delete an item
function deleteItem(event) {
    const id = parseInt(event.target.closest('.delete-item').dataset.id);
    items = items.filter(item => item.id !== id);
    renderItemInputs();
}

// Initialize the visualization
function initializeVisualization(event) {
    event.preventDefault();
    
    // Get capacity from input
    capacity = parseInt(document.getElementById('capacity').value) || 0;
    
    // Validation
    const errorElement = document.getElementById('errorMessage');
    
    if (items.length === 0) {
        errorElement.textContent = "Please add at least one item";
        return;
    }
    
    if (capacity <= 0) {
        errorElement.textContent = "Capacity must be greater than 0";
        return;
    }
    
    if (items.some(item => item.weight <= 0 || item.value <= 0)) {
        errorElement.textContent = "All weights and values must be greater than 0";
        return;
    }
    
    errorElement.textContent = "";
    
    // Initialize state
    currentRow = 0;
    currentCol = 0;
    selectedItems = [];
    isComplete = false;
    
    // Initialize DP table
    dpTable = Array(items.length + 1)
        .fill(null)
        .map(() => Array(capacity + 1).fill(0));
    
    // Show visualization section
    document.getElementById('visualizationSection').style.display = 'block';
    
    // Render the table
    renderDPTable();
    
    // Reset animation button
    document.getElementById('animateBtn').textContent = 'Start Animation';
    document.getElementById('animateBtn').classList.remove('btn-danger');
    document.getElementById('animateBtn').classList.add('btn-success');
    

    document.getElementById('algorithmSummary').style.display = 'none';
    
    // Scroll to visualization
    document.getElementById('visualizationSection').scrollIntoView({ behavior: 'smooth' });
}

// Render the DP table
function renderDPTable() {
    const container = document.getElementById('dpTableContainer');
    container.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'dp-table';
    
    // Create header row with capacity values
    const headerRow = document.createElement('tr');
    
    // Empty corner cell
    const cornerCell = document.createElement('th');
    cornerCell.innerHTML = `
        <div>Item / Capacity</div>
        <div class="small">Weight / Value</div>
    `;
    headerRow.appendChild(cornerCell);
    
    // Capacity headers
    for (let j = 0; j <= capacity; j++) {
        const th = document.createElement('th');
        th.innerHTML = `
            <div>${j}</div>
            <div class="small">-</div>
        `;
        headerRow.appendChild(th);
    }
    
    table.appendChild(headerRow);
    
    // Create table rows
    for (let i = 0; i <= items.length; i++) {
        const row = document.createElement('tr');
        
        // Row header with item info
        const rowHeader = document.createElement('th');
        if (i === 0) {
            rowHeader.innerHTML = `
                <div>0</div>
                <div class="small">-</div>
            `;
        } else {
            const isSelected = isComplete && selectedItems.includes(i);
            if (isSelected) {
                rowHeader.classList.add('selected-item');
            }
            rowHeader.innerHTML = `
                <div>Item ${i}</div>
                <div class="small">W: ${items[i-1].weight}, V: ${items[i-1].value}</div>
            `;
        }
        row.appendChild(rowHeader);
        
        // Table cells with DP values
        for (let j = 0; j <= capacity; j++) {
            const cell = document.createElement('td');
            
            // Determine cell state and content
            if (i === currentRow && j === currentCol) {
                cell.classList.add('current-cell');
            } else if (i <= currentRow && (i < currentRow || j <= currentCol)) {
                cell.classList.add('completed-cell');
                
                // Highlight cells that are part of the optimal solution
                if (isComplete && i > 0 && j > 0 && 
                    dpTable[i][j] > dpTable[i-1][j]) {
                    cell.classList.add('optimal-cell');
                }
            } else {
                cell.classList.add('pending-cell');
                cell.textContent = '?';
                continue; // Skip setting the value for pending cells
            }
            
            cell.textContent = dpTable[i][j];
            row.appendChild(cell);
        }
        
        table.appendChild(row);
    }
    
    container.appendChild(table);
    

}

// Move to the next step
function nextStep() {
    if (isComplete) return;
    
    let nextRow = currentRow;
    let nextCol = currentCol + 1;
    
    // Move to the next row if we've reached the end of the current row
    if (nextCol > capacity) {
        nextRow++;
        nextCol = 0;
    }
    
    // Check if we've completed the table
    if (nextRow > items.length) {
        completeAlgorithm();
        return;
    }
    
    // Update the DP table for the next cell
    if (nextRow === 0 || nextCol === 0) {
        dpTable[nextRow][nextCol] = 0;
    } else {
        const currentItem = items[nextRow - 1];
        if (currentItem.weight > nextCol) {
            dpTable[nextRow][nextCol] = dpTable[nextRow - 1][nextCol];
        } else {
            dpTable[nextRow][nextCol] = Math.max(
                dpTable[nextRow - 1][nextCol],
                dpTable[nextRow - 1][nextCol - currentItem.weight] + currentItem.value
            );
        }
    }
    
    // Update state
    currentRow = nextRow;
    currentCol = nextCol;
    
    // Render the updated table
    renderDPTable();
}

// Complete the algorithm
function completeAlgorithm() {
    isComplete = true;
    
    // Backtrack to find selected items
    selectedItems = [];
    let i = items.length;
    let j = capacity;
    
    while (i > 0 && j > 0) {
        if (dpTable[i][j] !== dpTable[i - 1][j]) {
            selectedItems.push(i);
            j -= items[i - 1].weight;
        }
        i--;
    }
    
    // Update animation button
    document.getElementById('animateBtn').textContent = 'Start Animation';
    document.getElementById('animateBtn').classList.remove('btn-danger');
    document.getElementById('animateBtn').classList.add('btn-success');
    isAnimating = false;
    
    // Render the final table
    renderDPTable();
    
    // Show algorithm summary
    document.getElementById('algorithmSummary').style.display = 'block';
    document.getElementById('finalMaxValue').textContent = dpTable[items.length][capacity];
    
    const finalSelectedItemsList = document.getElementById('finalSelectedItems');
    finalSelectedItemsList.innerHTML = '';
    selectedItems.forEach(id => {
        const li = document.createElement('li');
        li.textContent = `Item ${id} (Weight: ${items[id-1].weight}, Value: ${items[id-1].value})`;
        finalSelectedItemsList.appendChild(li);
    });
    
    const totalWeight = selectedItems.reduce((sum, id) => sum + items[id-1].weight, 0);
    document.getElementById('totalWeight').textContent = `${totalWeight} / ${capacity}`;
}

// Toggle animation
function toggleAnimation() {
    if (isComplete) return;
    
    if (isAnimating) {
        // Stop animation
        if (animationTimeout) {
            clearTimeout(animationTimeout);
            animationTimeout = null;
        }
        isAnimating = false;
        document.getElementById('animateBtn').textContent = 'Start Animation';
        document.getElementById('animateBtn').classList.remove('btn-danger');
        document.getElementById('animateBtn').classList.add('btn-success');
    } else {
        // Start animation
        isAnimating = true;
        document.getElementById('animateBtn').textContent = 'Stop Animation';
        document.getElementById('animateBtn').classList.remove('btn-success');
        document.getElementById('animateBtn').classList.add('btn-danger');
        animateNextStep();
    }
}

// Animate the next step
function animateNextStep() {
    if (!isAnimating || isComplete) return;
    
    nextStep();
    
    if (!isComplete) {
        animationTimeout = setTimeout(animateNextStep, ANIMATION_SPEED);
    } else {
        isAnimating = false;
        document.getElementById('animateBtn').textContent = 'Start Animation';
        document.getElementById('animateBtn').classList.remove('btn-danger');
        document.getElementById('animateBtn').classList.add('btn-success');
    }
}

// Reset the visualization
function reset() {
    // Stop animation if running
    if (animationTimeout) {
        clearTimeout(animationTimeout);
        animationTimeout = null;
    }
    isAnimating = false;
    
    // Reset state
    currentRow = 0;
    currentCol = 0;
    selectedItems = [];
    isComplete = false;
    
    // Initialize DP table
    dpTable = Array(items.length + 1)
        .fill(null)
        .map(() => Array(capacity + 1).fill(0));
    
    // Reset animation button
    document.getElementById('animateBtn').textContent = 'Start Animation';
    document.getElementById('animateBtn').classList.remove('btn-danger');
    document.getElementById('animateBtn').classList.add('btn-success');
    
    document.getElementById('algorithmSummary').style.display = 'none';
    
    // Render the table
    renderDPTable();
}