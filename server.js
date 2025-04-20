const express = require("express");
const app = express();
const path = require("path");
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://qvriolckcmvojsfovzjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cmlvbGNrY212b2pzZm92empkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4OTY3NzQsImV4cCI6MjA1ODQ3Mjc3NH0.HHLw7qtW3-zLeQVcdyZTuAPEDL3nxY9OMKTA7xoU-g4';

const supabase = createClient(supabaseUrl, supabaseKey);



app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.render('home');
});

function customRound(value) {
    if (value >= 99.6) return 100;
    const intPart = Math.floor(value);
    const decimal = value - intPart;

    if (decimal > 0 && decimal <= 0.4) {
        return intPart + 0.5;
    } else if (decimal > 0.4) {
        return intPart + 1;
    } else {
        return value; // already a whole number
    }
}

app.post('/College_list', async (req, res) => {
    try {
        const formData = req.body;
        // console.log('Received form data:', formData);

        // 1. Get rank from percentile
        const rank = await getRankFromPercentile(formData.percentile);
        if (!rank) {
            return res.status(400).json({ error: 'Could not determine rank from percentile' });
        }

        const selected_branches_code = await getSelectedBranchCode(formData.selected_branches);
        // console.log(selected_branches_code);
        
        // 2. Calculate rank range
        const { minRank, maxRank, topCollegeGive } = calculateRankRange(rank);
        
        // 3. Determine caste columns based on gender
        const { mainCaste, casteColumn } = getCasteColumns(formData.caste, formData.gender);

        // 4. Query for colleges
        const colleges = await getColleges(mainCaste, casteColumn, minRank, maxRank, formData);

        // 5. Filter and format results
        const filteredColleges = filterAndFormatColleges(colleges, formData, selected_branches_code);
        // console.log(filteredColleges); 

        res.json({
            new_data_of_student,
            filteredColleges
        });
       
    } catch (error) {
        console.error('Error in /College_list:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// Helper functions
async function getSelectedBranchCode(selected_branches) {
    try {
        const branchCodes = [];
        
        for (const branchName of selected_branches) {
            const { data, error } = await supabase
                .from('branch_code')
                .select('BRANCH__CODE')
                .eq('BRANCH__NAME', branchName)
                .single();
            
            if (error) throw error;
            if (data) branchCodes.push(data.BRANCH__CODE);
        }
        
        return branchCodes;
    } catch (error) {
        console.error('Error fetching branch codes:', error);
        throw error;
    }
}

async function getRankFromPercentile(percentile) {
    const roundedPercentile = customRound(percentile);
    
    try {
        const { data, error } = await supabase
            .from('rank')
            .select('RANK')
            .eq('PERCENTILE', roundedPercentile)
            .single();
            
        if (error) throw error;
        return data?.RANK || null;
    } catch (error) {
        console.error('Error fetching rank:', error);
        throw error;
    }
}

function calculateRankRange(rank) {
    let minRank = rank - 3000;
    let maxRank = rank + 5000;
    let topCollegeGive = true;

    if (rank < 3000) {
        minRank = 0;
        topCollegeGive = false;
    }

    return { minRank, maxRank, topCollegeGive };
}

function getCasteColumns(caste, gender) {
    const prefix = gender === 'Female' ? 'L' : 'G';
    new_data_of_student.mainCaste = `${prefix}OPEN`;

    new_data_of_student.casteColumn = caste;

    let main_caste = `${prefix}OPEN`;
    let caste_Column = caste;
    if(caste !== 'EWS'){
        caste_Column = `${prefix}${caste}`;
        new_data_of_student.casteColumn = `${prefix}${caste}`;
    }

    return {
        mainCaste: main_caste,
        casteColumn: caste
    };
}

const new_data_of_student = {
    mainCaste: '',
    casteColumn: '',
    specialReservation: ''
};



async function getColleges(mainCaste, casteColumn, minRank, maxRank, formData) {
    let specialReservationColumn = '';
    new_data_of_student.specialReservation = '';
    if (formData.specialReservation === 'PWD') {
        specialReservationColumn = 'PWDOPEN';
        new_data_of_student.specialReservation = 'PWD';
    } else if (formData.specialReservation === 'Defence') {
        specialReservationColumn = 'DEFOPENS';
        new_data_of_student.specialReservation = 'DEF';
    }

    // 🧠 Build the select string dynamically to avoid extra commas
    const baseColumns = [
        'CHOICE_CODE',
        'COLLEGE_CODE',
        'BRANCH_CODE',
        'GOPEN',
        'TFWS',
        specialReservationColumn, // may be empty
        'all_collage_code:COLLEGE_CODE(COLLAGE_NAME)',
        'branch_code:BRANCH_CODE(BRANCH__NAME,Flag)'
    ].filter(Boolean).join(', '); // removes any empty strings

    let query = supabase
        .from('all_cutoff_cet')
        .select(baseColumns)
        .gte('GOPEN', minRank)
        .lte('GOPEN', maxRank)
        .neq('GOPEN', 0)
        .order('GOPEN', { ascending: true });

    if (formData.caste === 'OPEN' && formData.gender === 'Female') {
        const columns = [
            'CHOICE_CODE',
            'COLLEGE_CODE',
            'BRANCH_CODE',
            'GOPEN',
            'LOPEN',
            'TFWS',
            specialReservationColumn,
            'all_collage_code:COLLEGE_CODE(COLLAGE_NAME)',
            'branch_code:BRANCH_CODE(BRANCH__NAME,Flag)'
        ].filter(Boolean).join(', ');

        query = supabase
            .from('all_cutoff_cet')
            .select(columns)
            .gte('LOPEN', minRank)
            .lte('LOPEN', maxRank)
            .neq('LOPEN', 0)
            .order('LOPEN', { ascending: true });
    }

    if (formData.caste !== 'OPEN') {
        const columns = [
            'CHOICE_CODE',
            'COLLEGE_CODE',
            'BRANCH_CODE',
            'GOPEN',
            mainCaste,
            casteColumn,
            'TFWS',
            specialReservationColumn,
            'all_collage_code:COLLEGE_CODE(COLLAGE_NAME)',
            'branch_code:BRANCH_CODE(BRANCH__NAME,Flag)'
        ].filter(Boolean).join(', ');

        const columnToFilter = formData.gender === 'Female' ? 'L' + formData.caste : 'G' + formData.caste;

        query = supabase
            .from('all_cutoff_cet')
            .select(columns)
            .gte(casteColumn, minRank)
            .lte(casteColumn, maxRank)
            .neq(formData.gender === 'Female' ? 'LOPEN' : 'GOPEN', 0)
            .order(formData.gender === 'Female' ? 'LOPEN' : 'GOPEN', { ascending: true });
    }

    try {
        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
            CHOICE_CODE: row.CHOICE_CODE,
            COLLAGE_NAME: row.all_collage_code?.COLLAGE_NAME,
            BRANCH_CODE: row.BRANCH_CODE,
            BRANCH__NAME: row.branch_code?.BRANCH__NAME,
            COLLEGE_CODE: row.COLLEGE_CODE,
            Flag: row.branch_code?.Flag,
            TFWS: row.TFWS,
            GOPEN: row.GOPEN,
            [mainCaste]: row[mainCaste],
            [casteColumn]: row[casteColumn],
            ...(formData.specialReservation === 'PWD' && { PWD: row.PWDOPEN }),
            ...(formData.specialReservation === 'Defence' && { DEF: row.DEFOPENS }),
            ...(formData.gender === 'Female' && { LOPEN: row.LOPEN })
        }));
    } catch (error) {
        console.error('Error fetching colleges:', error);
        throw error;
    }
}




function filterAndFormatColleges(colleges, formData, selected_branches_code) {
    let new_college_list = [];

    colleges.forEach((college) => {
        // Branch check
        let check_branch = '';
        if (formData.branchCategory == 'Tech') {
            check_branch = 'T';
        } else if (formData.branchCategory == 'Non-Tech') {
            check_branch = 'N';
        } else if (formData.branchCategory == 'Electrical') {
            check_branch = 'E';
        }

        if (formData.branchCategory !== 'All' && check_branch !== college.Flag) {
            return; // Skip this college
        }

        // Region check
        if (!formData.region.includes('All')) {
            const code = college.COLLEGE_CODE;
            let regionValid = false;

            if (formData.region.includes('AMRAVATI') && code >= 1000 && code < 2000) regionValid = true;
            if (formData.region.includes('AURANGABAD') && code >= 2000 && code < 3000) regionValid = true;
            if (formData.region.includes('MUMBAI') && code >= 3000 && code < 4000) regionValid = true;
            if (formData.region.includes('NAGPUR') && code >= 4000 && code < 5000) regionValid = true;
            if (formData.region.includes('NASIK') && code >= 5000 && code < 6000) regionValid = true;
            if (formData.region.includes('PUNE') && code >= 6000 && code < 7000) regionValid = true;

            if (!regionValid) {
                return; // Skip this college
            }
        }

        if (selected_branches_code.length != 0) {
            if (!selected_branches_code.includes(college.BRANCH_CODE)) {
                return;
            }
        }

        // If it passed all checks, add to new list
        new_college_list.push(college);
    });

    return new_college_list;
}

app.get('/fetchBranches', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('branch_code')
            .select('BRANCH__CODE, BRANCH__NAME');
            
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});

