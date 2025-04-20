const central_object = {
    mainCaste : '',
    casteColumn : '',
    specialReservation : ''
};

let selectedBranches = [];

// DOM elements
const casteSelect = document.getElementById('caste');
const tfwsContainer = document.getElementById('tfwsContainer');
const tfwsCheckbox = document.getElementById('tfws');
const branchCategorySelect = document.getElementById('branchCategory');
const collegeForm = document.getElementById('collegeForm');
const resultsContainer = document.getElementById('resultsContainer');
const collegeCardsContainer = document.getElementById('collegeCards');
const selectedCountElement = document.getElementById('selectedCount');
const finalizeBtn = document.getElementById('finalizeBtn');
const regionCheckboxGroup = document.getElementById('regionCheckboxGroup');

// Initialize
updateSelectedCount(0);

// Event Listeners
casteSelect.addEventListener('change', handleCasteChange);
collegeForm.addEventListener('submit', handleFormSubmit);
finalizeBtn.addEventListener('click', handleFinalizeClick);
regionCheckboxGroup.addEventListener('change', handleRegionCheckboxChange);

// Event Handlers
function handleCasteChange() {
    if (this.value === 'OPEN' || this.value === 'OBC') {
        tfwsContainer.style.display = 'block';
    } else {
        tfwsContainer.style.display = 'none';
        tfwsCheckbox.checked = false;
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get all checked region checkboxes
    const regionCheckboxes = document.querySelectorAll('input[name="region"]:checked');
    const regions = Array.from(regionCheckboxes).map(cb => cb.value);
    
    // If "All Regions" is selected, ignore other selections
    const finalRegions = regions.includes("All") ? ["All"] : regions;
    
    const formData = {
        percentile: parseFloat(document.getElementById('percentile').value),
        caste: casteSelect.value,
        gender: document.querySelector('input[name="gender"]:checked').value,
        specialReservation: document.getElementById('specialReservation').value,
        tfws: tfwsCheckbox.checked,
        branchCategory: branchCategorySelect.value,
        region: finalRegions,
        selected_branches:[]
    };

    // console.log('Form Data:', formData);
    generateCollegeList(formData);
}

function handleFinalizeClick() {
    const selectedCards = document.querySelectorAll('.college-card.selected');
    if (selectedCards.length > 0) {
        alert('Your college list is finalized!');
    } else {
        alert('Please select at least one college');
    }
}

function handleRegionCheckboxChange(e) {
    if (e.target.value === "All" && e.target.checked) {
        // If "All Regions" is checked, uncheck all other regions
        const otherCheckboxes = document.querySelectorAll('input[name="region"]:not([value="All"])');
        otherCheckboxes.forEach(cb => cb.checked = false);
    } else if (e.target.value !== "All" && e.target.checked) {
        // If any other region is checked, uncheck "All Regions"
        const allCheckbox = document.querySelector('input[name="region"][value="All"]');
        allCheckbox.checked = false;
    }
}

// Core Functions
async function generateCollegeList(formData) {

    
    formData.selected_branches = selectedBranches;
    // console.log(formData);
    try {
        const response = await fetch('/College_list', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });
    
        const data = await response.json();
        // console.log(data);
        // console.log(data.new_data_of_student)
        displayColleges(data.filteredColleges,formData,data.new_data_of_student);

    } catch (error) {
        console.log('Error:', error);
        // alert('An error occurred while fetching college data');
    }
}

function displayColleges(colleges,formData,newData) {
    collegeCardsContainer.innerHTML = '';
    
    if (!colleges || colleges.length === 0) {
        collegeCardsContainer.innerHTML = '<p>No colleges found matching your criteria.</p>';
        resultsContainer.style.display = 'block';
        return;
    }

    colleges.forEach(college => {

        if(formData.tfws){
            const card = createCollegeCard(college,newData,true);
            collegeCardsContainer.appendChild(card);
        }

        const card_1 = createCollegeCard(college,newData,false);
        collegeCardsContainer.appendChild(card_1);
        
    });
    
    resultsContainer.style.display = 'block';
    updateSelectedCount(colleges.length);
}



function createCollegeCard(college,newData,tfws) {
    const card = document.createElement('div');
    card.className = 'college-card selected';
    card.dataset.code = college.CHOICE_CODE;
    

    
    const categoryCutoff_1 = college[newData.casteColumn] || '0';
    const categoryCutoff_2 = college[newData.mainCaste] || '0';
    const categoryCutoff_3 = college[newData.specialReservation] || '0' ;
    const openCutoff = college.GOPEN || 'N/A';
    
    let clg_code = college.CHOICE_CODE;

    // console.log(categoryCutoff_1, ' ', categoryCutoff_2, ' ', categoryCutoff_3);

    if(tfws){
        clg_code = `${clg_code}T`;
    }

    let card_content = `
        <div class="college-card-header">
            <div class="college-code">${clg_code}</div>
            
            <input type="checkbox" checked class="card-checkbox">
        </div>
        <div class="college-name">${college.COLLAGE_NAME}</div>
        <div>${college.BRANCH__NAME}</div>
        <div class="college-details">
            <div class="college-detail">
                <div class="college-detail-label">GOPEN</div>
                <div>${openCutoff}</div>
            </div>
        `;

    if(newData.mainCaste != 'GOPEN'){
        card_content = card_content + `
            <div class="college-detail">
                <div class="college-detail-label">${newData.mainCaste}</div>
                <div>${categoryCutoff_2}</div>
            </div>
        `
    }

    if(newData.casteColumn != '' && newData.casteColumn != newData.mainCaste){
        card_content = card_content + `
            <div class="college-detail">
                <div class="college-detail-label">${newData.casteColumn}</div>
                <div>${categoryCutoff_1}</div>
            </div>
        `
    }

    
    // console.log(newData.specialReservation);
    if(newData.specialReservation != ''){
        card_content = card_content + `
            <div class="college-detail">
                <div class="college-detail-label">${newData.specialReservation}</div>
                <div>${categoryCutoff_3}</div>
            </div>
        `
    }

    if(tfws){
        card_content = card_content + `
            <div class="college-detail">
                <div class="college-detail-label">TFWS</div>
                <div>${college.TFWS}</div>
            </div>
        `
    }

    card.innerHTML = card_content + `
        </div>
    `;
    
    card.addEventListener('click', function(e) {
        if (e.target.type !== 'checkbox') {
            const checkbox = this.querySelector('.card-checkbox');
            checkbox.checked = !checkbox.checked;
            this.classList.toggle('selected', checkbox.checked);
            updateSelectedCount();
        }
    });
    
    const checkbox = card.querySelector('.card-checkbox');
    checkbox.addEventListener('change', function() {
        card.classList.toggle('selected', this.checked);
        updateSelectedCount();
    });
    
    return card;
}

function updateSelectedCount(count) {
    if (typeof count === 'number') {
        selectedCountElement.textContent = `${count} selected`;
    } else {
        const selectedCount = document.querySelectorAll('.college-card.selected').length;
        selectedCountElement.textContent = `${selectedCount} selected`;
    }
}




// Add these DOM references at the top
const customBranchBtn = document.getElementById('customBranchBtn');
const branchSelect = document.getElementById('branch');
const selectedBranchesContainer = document.getElementById('selectedBranchesContainer');
const branchSelectionGroup = document.getElementById('branchSelectionGroup');

// Add this to your initialization



// Add this event listener
customBranchBtn.addEventListener('click',()=>{
    customBranchBtn.style.display = 'none';
    toggleBranchSelection();
});
branchSelect.addEventListener('change', handleBranchSelection);

// Add these new functions
function toggleBranchSelection() {
    // customBranchBtn.classList.add('hidden');
    branchSelect.classList.remove('hidden');
    branchSelect.focus();
}

function handleBranchSelection() {
    if (this.value && !selectedBranches.includes(this.value)) {
        selectedBranches.push(this.value);
        updateSelectedBranchesDisplay();
        
        // Remove selected option from dropdown
        this.querySelector(`option[value="${this.value}"]`).remove();
        
        // Reset dropdown
        this.value = '';
        
        // Hide dropdown if all branches are selected
        if (this.options.length <= 1) {
            branchSelect.classList.add('hidden');
        }
    }
}

function updateSelectedBranchesDisplay() {
    selectedBranchesContainer.innerHTML = '';
    
    selectedBranches.forEach(branchValue => {
        const branchText = branchSelect.querySelector(`option[value="${branchValue}"]`)?.text || branchValue;
        
        const tag = document.createElement('div');
        tag.className = 'branch-tag';
        tag.innerHTML = `
            ${branchText}
            <button type="button" data-value="${branchValue}">&times;</button>
        `;
        
        tag.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            removeBranch(branchValue);
        });
        
        selectedBranchesContainer.appendChild(tag);
    });
    
    // Show/hide the add button based on remaining branches
    if (branchSelect.options.length > 1) {
        customBranchBtn.classList.remove('hidden');
    }
}

function removeBranch(branchValue) {
    selectedBranches = selectedBranches.filter(b => b !== branchValue);
    
    // Add the option back to the dropdown
    const optionText = [...branchSelect.options].find(opt => opt.value === branchValue)?.text || branchValue;
    if (optionText) {
        const option = new Option(optionText, branchValue);
        branchSelect.appendChild(option);
    }
    
    updateSelectedBranchesDisplay();
    
}


document.addEventListener("DOMContentLoaded", fetchBranches());


async function fetchBranches() {
    
    try {

        const response = await fetch('/fetchBranches');
        const data = await response.json();
        // console.log(data);

        const optionsHolder = document.getElementById('branch');
        optionsHolder.innerHTML = '<option value="" disabled selected>Select branches</option>';

        data.forEach(element => {
            const option = document.createElement('option');
            option.value = `${element.BRANCH__NAME}`;
            option.innerHTML = `${element.BRANCH__NAME}`;

            optionsHolder.appendChild(option);
        });
        
        
    } catch (error) {
        console.log(error);
    }

}
