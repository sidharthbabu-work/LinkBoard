// Global variable to hold tile data
let items = JSON.parse(localStorage.getItem("tiles") || "[]");

// --- UTILITY FUNCTIONS ---

// 1. HELPER: Enforces https://
function fixUrl(url) {
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) {
        return "https://" + url;
    }
    return url;
}

// 2. Swaps two items within the array
function swapItems(index1, index2) {
    if (index1 < 0 || index2 < 0 || index1 >= items.length || index2 >= items.length) {
        return;
    }
    [items[index1], items[index2]] = [items[index2], items[index1]];
    localStorage.setItem('tiles', JSON.stringify(items));
    render();
}

// 3. Moves a tile (direction: 1 for right, -1 for left)
function moveItem(index, direction) {
    const currentItem = items[index];
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= items.length) return;
    
    const nextItem = items[newIndex];

    // Check if the items are in the same group before swapping
    if (currentItem.group === nextItem.group) {
        swapItems(index, newIndex);
    }
}

// 4. Saves current state to Local Storage
function updateStorage() {
    localStorage.setItem('tiles', JSON.stringify(items));
    closeModal();
    render();
}

// 5. FUNCTION TO BACKUP DATA (DOWNLOAD)
function backupData() {
    if (items.length === 0) {
        alert("Cannot create a backup: Your dashboard is currently empty.");
        return;
    }

    // 1. Convert current data to a JSON string
    const dataStr = JSON.stringify(items, null, 2); 
    
    // 2. Create a Blob object from the JSON string
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    // 3. Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);
    
    // 4. Create a temporary <a> element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    
    // 5. Generate a filename with a timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `dashboard_backup_${timestamp}.json`;
    
    // 6. Programmatically click the link to initiate download
    document.body.appendChild(a);
    a.click();
    
    // 7. Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 6. FUNCTION TO RESTORE DATA (UPLOAD)
function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("WARNING: Restoring data will overwrite all existing shortcuts. Are you sure you want to proceed?")) {
        // Clear the file input so the user can select the same file again if needed
        event.target.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const uploadedData = JSON.parse(e.target.result);
            
            // Basic validation: Check if it's an array and looks like our data structure
            if (Array.isArray(uploadedData) && (uploadedData.length === 0 || uploadedData[0].name && uploadedData[0].url)) {
                
                // Overwrite the global items array
                items = uploadedData;
                
                // Save the new data to Local Storage
                localStorage.setItem('tiles', JSON.stringify(items));
                
                alert(`Successfully restored ${items.length} shortcuts.`);
                
                // Re-render the dashboard to show restored items
                render();
            } else {
                alert("Error: The file format is invalid or corrupted.");
            }
        } catch (error) {
            console.error("Error parsing JSON:", error);
            alert("Error: Could not read file. Please ensure it is a valid JSON backup file.");
        }
        // Clear the file input after processing
        event.target.value = ''; 
    };

    reader.onerror = function() {
        alert("Error reading file.");
        event.target.value = '';
    };

    reader.readAsText(file);
}

// --- GROUP MANAGEMENT FUNCTIONS ---

// 7. Renames all items in a group
function renameGroup(oldGroupName, newGroupName) {
    if (!newGroupName.trim() || oldGroupName === newGroupName.trim()) return false;

    items.forEach(item => {
        if (item.group === oldGroupName) {
            item.group = newGroupName.trim();
        }
    });

    localStorage.setItem('tiles', JSON.stringify(items));
    return true; // Return true on success
}

// 8. Moves a group up/down by manipulating the 'group' property order in the items array
function moveGroup(groupKey, direction, allGroupKeys) {
    const currentIndex = allGroupKeys.indexOf(groupKey);
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= allGroupKeys.length) return;

    // Create a mapping of the new group order
    const newGroupOrder = [...allGroupKeys];
    [newGroupOrder[currentIndex], newGroupOrder[newIndex]] = [newGroupOrder[newIndex], newGroupOrder[currentIndex]];

    // Re-sort the main items array based on the new group order
    items.sort((a, b) => {
        const indexA = newGroupOrder.indexOf(a.group);
        const indexB = newGroupOrder.indexOf(b.group);
        // Secondary sort by original index if group is the same, to maintain tile order within the group
        return indexA - indexB || items.indexOf(a) - items.indexOf(b);
    });

    localStorage.setItem('tiles', JSON.stringify(items));
    render();
}

// 9. Populates the datalist with current group names
function updateGroupDatalist() {
    const datalist = document.getElementById('groupOptions');
    datalist.innerHTML = '';
    
    // Get unique group keys
    const uniqueGroups = items.map(item => item.group).filter((value, index, self) => self.indexOf(value) === index);
    
    // Add each unique group as an option
    uniqueGroups.forEach(groupName => {
        if (groupName) { // Exclude null/empty groups if any exist
            const option = document.createElement('option');
            option.value = groupName;
            datalist.appendChild(option);
        }
    });
}

// --- CRUD & Modal Functions ---

function deleteItem(index) {
    if (confirm("Delete this shortcut?")) {
        items.splice(index, 1);
        updateStorage();
    }
}

function openEditModal(index) {
    // 1. Update the datalist options before opening
    updateGroupDatalist();

    const item = items[index];
    
    document.getElementById('modalTitle').textContent = "Edit Shortcut";
    document.getElementById('editIndex').value = index;
    
    document.getElementById('nameInput').value = item.name;
    document.getElementById('urlInput').value = item.url.replace(/^https?:\/\//i, ''); 
    
    document.getElementById('modalGroupInput').value = item.group || '';
    
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('nameInput').focus();
}

function openAddModal() {
    // 1. Update the datalist options before opening
    updateGroupDatalist();

    document.getElementById('modalTitle').textContent = "Add Shortcut";
    document.getElementById('editIndex').value = "";
    document.getElementById('modalGroupInput').value = ''; 
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('nameInput').focus();
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('nameInput').value = '';
    document.getElementById('urlInput').value = '';
    document.getElementById('imgInput').value = '';
    document.getElementById('editIndex').value = ''; 
    document.getElementById('modalGroupInput').value = ''; 
}

function saveItem() {
    const name = document.getElementById('nameInput').value.trim();
    let url = document.getElementById('urlInput').value.trim();
    const file = document.getElementById('imgInput').files[0];
    const editIndex = document.getElementById('editIndex').value;
    
    // Group logic remains the same: use the input value (either typed or selected)
    const rawGroup = document.getElementById('modalGroupInput').value.trim();
    const group = rawGroup || 'Others'; 

    if (!name || !url) return alert("Name and URL are required.");

    url = fixUrl(url);

    const updateTile = (imgSrc) => {
        const newItem = { name, url, img: imgSrc, group: group };

        if (editIndex !== "") {
            items[editIndex] = newItem;
        } else {
            items.push(newItem);
        }
        updateStorage();
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            updateTile(e.target.result);
        }
        reader.readAsDataURL(file);
    } else {
        let imgSrc = items[editIndex]?.img;
        
        if (editIndex === "" || !imgSrc || !imgSrc.includes('data:image')) {
            let domain = url;
            try { domain = new URL(url).hostname; } catch(e){}
            imgSrc = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
        }
        
        updateTile(imgSrc);
    }
}


// --- RENDERING & INITIALIZATION ---

function render() {
    const mainContainer = document.getElementById("mainContainer");
    mainContainer.innerHTML = '';
    
    // Fix: Check if the list is completely empty
    if (items.length === 0) {
        // Render a basic grid with only the 'Add New' button
        const initialContainer = document.createElement('div');
        initialContainer.className = 'group-container';
        
        const initialGrid = document.createElement('div');
        initialGrid.className = 'grid';
        initialContainer.appendChild(initialGrid);

        const addBtn = document.createElement('div');
        addBtn.className = 'tile add-tile';
        addBtn.addEventListener('click', openAddModal);
        addBtn.innerHTML = '<span>+</span>';
        initialGrid.appendChild(addBtn);

        mainContainer.appendChild(initialContainer);
        return; // Stop execution here if the list is empty
    }

    
    // 1. Group items and determine the current order
    const groupedItems = items.reduce((acc, item) => {
        const groupKey = item.group || 'Others'; 
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
    }, {});
    
    // Get unique group keys in the current array order
    const allGroupKeys = items.map(item => item.group).filter((value, index, self) => self.indexOf(value) === index);
    
    // 2. Loop through groups and render a container for each
    allGroupKeys.forEach(groupKey => {
        const groupTiles = groupedItems[groupKey] || [];
        const groupIndex = allGroupKeys.indexOf(groupKey);
        
        if (groupTiles.length === 0) return;

        const groupContainer = document.createElement('div');
        groupContainer.className = 'group-container';
        
        const header = document.createElement('div');
        header.className = 'group-header';

        // Group Title Area (handles static text and rename input)
        const titleArea = document.createElement('div');
        titleArea.className = 'group-title-area';
        titleArea.textContent = groupKey;
        header.appendChild(titleArea);

        // Group Action Buttons Container
        const groupActionsDiv = document.createElement('div');
        groupActionsDiv.className = 'group-actions';

        // Group Rename Button (Will be reused as the Save button during rename)
        const renameBtn = document.createElement('button');
        renameBtn.className = 'group-action-btn';
        renameBtn.innerHTML = 'Rename';
        // IMPORTANT: Attach the initial click listener here, passing the handler reference
        renameBtn.addEventListener('click', function handler(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleGroupRename(titleArea, groupActionsDiv, groupKey, handler); 
        });

        // Group Move Up Button
        const moveUpBtn = document.createElement('button');
        moveUpBtn.className = 'group-action-btn group-move-btn';
        moveUpBtn.innerHTML = '&#9650;'; // Up Arrow
        if (groupIndex === 0) { moveUpBtn.disabled = true; }
        moveUpBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            moveGroup(groupKey, -1, allGroupKeys); // direction -1 (Up)
        });

        // Group Move Down Button
        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = 'group-action-btn group-move-btn';
        moveDownBtn.innerHTML = '&#9660;'; // Down Arrow
        if (groupIndex === allGroupKeys.length - 1) { moveDownBtn.disabled = true; }
        moveDownBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            moveGroup(groupKey, 1, allGroupKeys); // direction +1 (Down)
        });

        groupActionsDiv.appendChild(renameBtn);
        groupActionsDiv.appendChild(moveUpBtn);
        groupActionsDiv.appendChild(moveDownBtn);
        header.appendChild(groupActionsDiv);
        groupContainer.appendChild(header);


        const grid = document.createElement('div');
        grid.className = 'grid';
        groupContainer.appendChild(grid);

        // 3. Render tiles within the group's grid
        groupTiles.forEach(item => {
            // Find the global index of the item for use with move/delete functions
            const globalIndex = items.findIndex(i => i === item); 
            // Find the index within the currently rendered group for move disabling
            const groupItemIndex = groupTiles.indexOf(item); 

            const safeUrl = fixUrl(item.url);
            const tile = document.createElement('a');
            tile.className = 'tile';
            tile.href = safeUrl;
            tile.target = "_blank";
            tile.dataset.index = globalIndex; 
            
            const img = document.createElement('img');
            img.src = item.img;
            img.onerror = () => { img.src = "https://via.placeholder.com/64/444444/ffffff?text=" + item.name[0]; };

            const span = document.createElement('span');
            span.textContent = item.name;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'tile-actions';

            // 1. Move Left Button 
            const moveLeftBtn = document.createElement('button');
            moveLeftBtn.className = 'action-btn move-btn';
            moveLeftBtn.innerHTML = '&#9664;';
            if (groupItemIndex === 0) { moveLeftBtn.disabled = true; } 
            moveLeftBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                moveItem(globalIndex, -1);
            });

            // 2. Edit Button 
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn edit-btn';
            editBtn.innerHTML = '&#9998;';
            editBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                openEditModal(globalIndex);
            });

            // 3. Move Right Button 
            const moveRightBtn = document.createElement('button');
            moveRightBtn.className = 'action-btn move-btn';
            moveRightBtn.innerHTML = '&#9654;';
            if (groupItemIndex === groupTiles.length - 1) { moveRightBtn.disabled = true; } 
            moveRightBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                moveItem(globalIndex, 1);
            });
            
            // 4. Delete Button
            const delBtn = document.createElement('button');
            delBtn.className = 'action-btn delete-btn';
            delBtn.innerHTML = '&times;';
            delBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                deleteItem(globalIndex);
            });

            actionsDiv.appendChild(moveLeftBtn);
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(moveRightBtn);
            actionsDiv.appendChild(delBtn);

            tile.appendChild(img);
            tile.appendChild(span);
            tile.appendChild(actionsDiv);
            grid.appendChild(tile);
        });
        
        // Add the 'Add New' button to the grid
        const addBtn = document.createElement('div');
        addBtn.className = 'tile add-tile';
        addBtn.addEventListener('click', openAddModal);
        addBtn.innerHTML = '<span>+</span>';
        grid.appendChild(addBtn);

        mainContainer.appendChild(groupContainer);
    });
}

// Function to handle the group renaming UI state and save operation
function toggleGroupRename(titleArea, actionsDiv, oldGroupName, originalRenameHandler) {
    // Check if the input already exists (i.e., we are in rename mode)
    if (titleArea.querySelector('.group-rename-input')) return;

    const currentTitle = titleArea.textContent;
    titleArea.innerHTML = ''; 

    // Create the input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'group-rename-input';
    titleArea.appendChild(input);
    input.focus();

    // Elements to manipulate
    const renameBtn = actionsDiv.querySelector('.group-action-btn:nth-child(1)'); // The original Rename button
    const moveUpBtn = actionsDiv.querySelector('.group-move-btn:nth-child(2)');
    const moveDownBtn = actionsDiv.querySelector('.group-move-btn:nth-child(3)');
    
    // Store original state
    const originalRenameText = renameBtn.textContent;
    const originalRenameBackground = renameBtn.style.background;
    
    // Hide move buttons
    moveUpBtn.style.display = 'none';
    moveDownBtn.style.display = 'none';
    
    // Change rename button to 'Save'
    renameBtn.textContent = 'Save';
    renameBtn.style.background = '#28a745';

    // Create a cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'group-action-btn';
    cancelBtn.innerHTML = 'Cancel';
    cancelBtn.style.background = '#dc3545';
    actionsDiv.insertBefore(cancelBtn, renameBtn);

    const finishRename = (isSave) => {
        // 2. Remove temporary listeners
        renameBtn.removeEventListener('click', saveHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        
        if (isSave) {
            const newGroupName = input.value.trim();
            if (renameGroup(oldGroupName, newGroupName)) {
                // SUCCESS: Rerender the whole page to show the new group name
                render(); 
                return;
            }
        }
        
        // CANCELED or FAILED to rename: Restore original UI
        titleArea.textContent = oldGroupName;
        renameBtn.textContent = originalRenameText;
        renameBtn.style.background = originalRenameBackground;
        
        // 3. Re-attach the original Rename listener
        renameBtn.addEventListener('click', originalRenameHandler);

        cancelBtn.remove();
        moveUpBtn.style.display = '';
        moveDownBtn.style.display = '';
    };

    // Define temporary handlers for Save/Cancel
    const saveHandler = (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        finishRename(true);
    };

    const cancelHandler = (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        finishRename(false);
    };
    
    // 4. Attach temporary listeners
    renameBtn.addEventListener('click', saveHandler);
    cancelBtn.addEventListener('click', cancelHandler);

    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishRename(true);
        }
    };
}


// --- INITIAL SETUP ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Wire up static modal buttons
    document.getElementById('cancelButton').addEventListener('click', closeModal);
    document.getElementById('saveButton').addEventListener('click', saveItem);
    
    // 2. Wire up the Backup button
    document.getElementById('backupButton').addEventListener('click', backupData);
    
    // 3. Wire up the Restore input (listens for file selection change)
    document.getElementById('restoreInput').addEventListener('change', restoreData);

    // 4. Close modal if clicking outside (backdrop)
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });

    // 5. Initial render
    render();
});