import fs from 'node:fs/promises';
import createPrompt from 'prompt-sync';

const prompt = createPrompt();

let employees = [];
let currencyData;

// Function to format and log employee salary
const getSalary = (amountUSD, currency) => {
  if (!currencyData.rates[currency]) {
    console.error(`Currency code '${currency}' is invalid.`);
    return 'Invalid currency';
  }

  const amount = currency === 'USD' ? amountUSD : amountUSD * currencyData.rates[currency];
  const formatter = Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  return formatter.format(amount);
};

const logEmployee = (employee) => {
  Object.entries(employee).forEach((entry) => {
    if (entry[0] !== 'salaryUSD' && entry[0] !== 'localCurrency') {
      console.log(`${entry[0]}: ${entry[1]}`);
    }
  });
  console.log(`Salary USD: ${getSalary(employee.salaryUSD, 'USD')}`);
  console.log(
    `Local Salary: ${getSalary(employee.salaryUSD, employee.localCurrency)}`,
  );
};

// Fetch currency conversion data from API
const currencyConversionData = async () => {
  const myHeaders = new Headers();
  myHeaders.append('apikey', '7Mi3Gsv8pwsfdwiIviHf7eApR4ifbyWd');
  const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow',
  };

  const response = await fetch(
    'https://api.apilayer.com/exchangerates_data/latest?base=USD',
    requestOptions,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch API: ${response.status}`);
  }

  currencyData = await response.json();
  console.log(JSON.stringify(currencyData, null, 2));
};

// Load employee data from JSON file
const loadData = async () => {
  try {
    const data = await fs.readFile('./data.json', 'utf-8');
    employees = JSON.parse(data);
  } catch (err) {
    console.error("Can't read the file");
    throw err;
  }
};

// Write updated employee data back to JSON file
const writeData = async () => {
  console.log('Writing employees...');
  try {
    await fs.writeFile('./data.json', JSON.stringify(employees, null, 2));
  } catch (err) {
    console.error("Can't write the file", err);
    throw err;
  }
};

// Function to get user input with validation
function getInput(promptText, validator, transformer) {
  const value = prompt(promptText);
  if (validator && !validator(value)) {
    console.error('Invalid Input...');
    return getInput(promptText, validator, transformer);
  }
  if (transformer) {
    return transformer(value);
  }

  return value;
}

// Get the next available employee ID
const getNextEmployeeId = () => {
  const nextId = Math.max(...employees.map((e) => e.id), 0);
  return nextId + 1;
};

// Check if the currency code is valid
const isCurrencyCodeValid = (code) => {
  const currencyCodes = Object.keys(currencyData.rates);
  return currencyCodes.indexOf(code) > -1;
};

// Transform Yes/No input to boolean
const transformBooleanValue = (input) => input === 'Yes';

// Validate string input
const isStringInputValid = (input) => input.trim() !== '';

// Validate boolean input
const isBooleanInputValid = (input) => input === 'Yes' || input === 'No';

// Validate integer input within a range
const isIntegerValid = (min, max) => (input) => {
  const numValue = Number(input);
  return Number.isInteger(numValue) && numValue >= min && numValue <= max;
};

// List all employees
function listEmployees() {
  console.log('Employee list-------------------');
  console.log('');
  employees.forEach((e) => {
    logEmployee(e);
    prompt('Press enter to continue...');
  });
  console.log('Employee list is completed');
}

// Add a new employee
async function addEmployee() {
  console.log('Add Employee--------------------------');
  console.log('');
  const employee = {};
  employee.id = getNextEmployeeId();
  employee.firstName = getInput('First Name:', isStringInputValid);
  employee.lastName = getInput('Last Name:', isStringInputValid);
  employee.startDateYear = getInput(
    'Employee start year:',
    isIntegerValid(1990, 2023),
  );
  employee.startDateMonth = getInput(
    'Employee start month:',
    isIntegerValid(1, 12),
  );
  employee.startDateDay = getInput(
    'Employee start date:',
    isIntegerValid(1, 30),
  );

  employee.isActive = getInput(
    'Is employee active? (Yes/No):',
    isBooleanInputValid,
    transformBooleanValue,
  );
  employee.salaryUSD = getInput(
    'Annual Salary In USD:',
    isIntegerValid(10000, 1000000),
  );
  employee.localCurrency = getInput(
    'Local Currency Code (3 letters):',
    isCurrencyCodeValid,
  );

  employee.startDate = new Date(
    employee.startDateYear,
    employee.startDateMonth - 1, // Month is 0-indexed
    employee.startDateDay,
  );

  employees.push(employee);
  await writeData();
}

// Search for employee by ID
function searchById() {
  const id = Number(getInput('Employee ID:', null, Number));
  const result = employees.find((e) => e.id === id);

  if (result) {
    console.log('');
    logEmployee(result);
  } else {
    console.error('No result found.');
  }
  return searchById();
}

// Search for employee by name
function searchByName() {
  const firstNameSearch = getInput('First Name:').toLowerCase();
  const lastNameSearch = getInput('Last Name:').toLowerCase();
  const results = employees.filter((e) => {
    if (
      firstNameSearch
      && !e.firstName.toLowerCase().includes(firstNameSearch)
    ) {
      return false;
    }
    if (lastNameSearch && !e.lastName.toLowerCase().includes(lastNameSearch)) {
      return false;
    }
    return true;
  });

  if (results.length > 0) {
    results.forEach((e, idx) => {
      console.log('');
      console.log(`Search result: ${idx + 1}`);
      logEmployee(e);
    });
  } else {
    console.log('Not found...');
  }
}

// Main function to handle commands
const main = async () => {
  const command = process.argv[2];
  switch (command) {
    case 'list':
      listEmployees();
      break;
    case 'add':
      await addEmployee();
      break;
    case 'search':
      searchById();
      break;
    case 'search-by-name':
      searchByName();
      break;
    default:
      console.log('Invalid Command......');
      process.exit(1);
  }
};

// Load data and start the application
Promise.all([loadData(), currencyConversionData()])

  .then(main)
  .catch((err) => {
    console.error('Cannot complete startup');
    throw err;
  });
