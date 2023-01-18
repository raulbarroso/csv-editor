// tabs
var tabs = document.getElementsByClassName("tab")
for (i = 0; i < tabs.length; i++){
  tabs[i].onclick = select;
}
tabs[0].style = "background-color: #124379;";

// sections
sections = document.getElementsByTagName("SECTION");
sections[0].style = "display: block;"

var action = tabs[0].innerHTML;

function select(){
  action = this.innerHTML;
  // tabs
  for (i = 0; i < tabs.length; i++){
    tabs[i].style = "background-color: #bbb;";
  }
  this.style = "background-color: #124379;";
  // section
  for (i = 0; i < sections.length; i++){
    sections[i].style = "display: none;";
  }
  document.getElementById(action).style = "display: block;"
}

function read() {
  var reader = new FileReader();
  reader.onload = function(){
    var csv = Papa.parse(reader.result);
    if (action == "Woocommerce"){
      var newCsvData = convert(csv);
    } else if (action == "Filter"){
      var newCsvData = filter(csv);
    } else if (action == "Replace"){
      var newCsvData = replace(csv);
    } else if (action == "PriceTiers"){
      var newCsvData = pricetier(csv);
    }
    var newCsv = Papa.unparse(newCsvData);
    download(filename, newCsv);
  }
  if (input.files[0]){
    reader.readAsText(input.files[0]);
  } else {
    alert('No file chosen');
  }
}

// edits the csv file for woo compatability
function convert(obj) {
  var table = obj.data;

  console.log(table);

  if (table[table.length - 1] == ""){
    table.pop();
  }

  // cols
  var sku = makeArr('Internal Reference', table);
  var name = makeArr('Name', table)
  var brand = makeArr('Brand', table);
  var description = makeArr('Sales Description', table);
  var price = makeArr('Sales Price', table);
  var weight = makeArr('Weight', table);
  var width = makeArr('Width (in)', table);
  var height = makeArr('Height (in)', table);
  var length = makeArr('Length (in)', table);
  var productKey = makeArr('Product Key', table);
  var category = makeArr('Product Category', table)

  for (i = 0; i < category.length; i++){
    category[i] = category[i].split(" / ").join(" > ");
    if (productKey[i].split("_:_").length > 2 && productKey[i].split("_:_")[1] == "Pump"){
      category[i] = "All Pumps > " + category[i];
    }
  }

  var markets = [];
  for (i = 0; i < productKey.length; i++){
    var pKey = productKey[i].split("_:_");
    if (pKey[1] == "Pump" && pKey[8] != "market"){
      markets[i] = pKey[8];
    }
    else {
      markets[i] = "";
    }
  }

  // create attribute arrays
  var attKeys = [];
  var attVals = [];
  for (i = 0; i < productKey.length; i++){

    var pKey = productKey[i].split("_:_");

    if (productKey[i] == ''){
      // no product key
      attKeys.push(['']);
      attVals.push(['']);
    } else if (pKey.length < 2) {
      // faulty product key
      console.log("Error with product key:");
      console.log(sku[i]);
      attKeys.push(['']);
      attVals.push(['']);
    } else {
      // functional product key
      var arrKeys = [];
      var arrVals = [];
      if (pKey[1] == "Pump") {
        var emptyKey = [":", "product", "sku", "installation", "drive", "water", "application", "child-category", "market", "brand",
                        "model", "hp", "discharge-size", "discharge-type", "phase", "voltage", "rpm", "seal", "mh", "head-range", "mf",
                        "flow-range", "curve"];
        if (pKey[3] == "Surface"){
          emptyKey.push("suction");
        } else if (pKey[3] == "Submersible"){
          emptyKey.push("motor-protection");
          emptyKey.push("operation");
          emptyKey.push("cable");
        }
        if (pKey[6] == "DeepWell"){
          emptyKey.push("motor-sku");
        }
      } else if (pKey[1] == "Motor") {
        var emptyKey = [":", "product", "sku", "brand", "model", "phase", "casting-material", "enclosure", "frame", "rpm", "bearing", "voltage", "hp"];
      } else {
        var emptyKey = [];
      }
      // loop
      for (j = 0; j < pKey.length && j < emptyKey.length; j++){
        if (pKey[j] != emptyKey[j]){
          if (keyIsAttribute(pKey[1], emptyKey[j])){
            arrKeys.push(getCleanAttKey(pKey[1], emptyKey[j]));
            arrVals.push(getCleanAttVals(pKey[1], emptyKey[j], pKey[j]));
          }
        }
      }
      if (arrKeys.length > 1) {
        attKeys.push(arrKeys);
        attVals.push(arrVals);
      } else {
        // faulty product key
        console.log("Error with product key:");
        console.log(sku[i]);
        attKeys.push(['']);
        attVals.push(['']);
      }
    }
  }

  function keyIsAttribute(product, key){
    if (product == "Pump"){
      var arr = ["product", "installation", "drive", "water", "application", "child-category", "market", "brand", "model", "hp", "discharge-size", 
                  "discharge-type", "phase", "voltage", "rpm", "seal", "mh", "mf", "suction", "motor-protection", "operation",
                  "cable", "motor-sku"];
    } else if (product == "Motor"){
      var arr = ["product", "brand", "model", "phase", "casting-material", "enclosure", "frame", "rpm", "bearing", "voltage", "hp"];
    } else {
      console.log("Error, not in function:" + product);
      return false;
    }
    if (arr.indexOf(key) != -1){
      return true;
    } else {
      return false;
    }
  }

  function getCleanAttKey(product, key){
    switch (key){
      case "hp":
        key = "Horsepower";
        break;
      case "rpm":
        key = "RPM";
        break;
      case "mh":
        key = "Max Head";
        break;
      case "mf":
        key = "Max Flow";
        break;
    }
    var arr = key.split('-');
    for (k = 0; k < arr.length; k++){
      arr[k] = arr[k].charAt(0).toUpperCase() + arr[k].slice(1);
    }
    key = arr.join(' ')
    return key;
  }

  function getCleanAttVals(product, key, vals){
    if (product == "Pump" || product == "Motor") {
      switch (key){
        case "market":
          vals = vals.split("MiningQuarry").join("Mining & Quarry");
          break;
        case "brand":
          if (vals == "FlintWalling"){
            return "Flint & Walling";
          }
          break;
        case "model":
          return vals.split(",").join(" ");
        case "hp":
          return vals.split("HP").join('');
        case "discharge-size":
          return vals.split("Discharge").join(" in");
        case "phase":
        case "seal":
          vals = vals.replace("1", "Single");
          vals = vals.replace("2", "Double");
          vals = vals.replace("3", "Three");
          break;
        case "rpm":
          return vals.split("RPM").join(" RPM");
        case "mh":
          return vals.split("mh").join(" ft");
        case "mf":
          return vals.split("mf").join(" GPM")
        case "suction":
          return vals.split("Suction").join(" in");
        case "motor-protection":
          if (vals == "ThermalOverload") {
            return "Auto Reset Thermal Overload";
          }
          break;
        case "operation":
          return vals.split("Operation").join('');
        case "cable":
          return vals.split("Cable").join(" ft");
        case "motor-sku":
          return vals;
        // motor
        case "frame":
          return vals.split("Frame").join("");
      } 
      // add spaces between capitalized words
      valArr = vals.split('');
      for (k = 1; k < valArr.length; k++) {
        if (/[A-Z]/.test(valArr[k]) && valArr[k - 1] != " " && !(/[A-Z]/.test(valArr[k - 1]))){
          valArr.splice(k, 0, " ");
          k++
        }
      }
      return valArr.join('');
    }
    return vals
  }

  // Get max attribute
  var maxAtt = 0;
  for (i = 0; i < attKeys.length; i++){
    if (attKeys[i].length > maxAtt){
      maxAtt = attKeys[i].length;
    }
  }

  // Create extension for first row
  var attCols = []
  for (i = 1; i <= maxAtt; i++){
    attCols.push("Attribute " + i + " name");
    attCols.push("Attribute " + i + " value(s)");
    attCols.push("Attribute " + i + " visible");
    attCols.push("Attribute " + i + " global");
  }

  // the first row of the new table, two columns
  var newTable = [["sku", "name", "description", "meta: _custom_product_textarea", "categories", "regular price", "weight", "width", "height", "length"]];
  newTable[0] = newTable[0].concat(attCols);
  for (i = 0; i < sku.length; i++){
    // only adds rows with Shop tag
    if(true){
      // each loop puts elements in the same row
      var row = [];

      row.push(sku[i]);
      row.push(name[i]);
      row.push(description[i]);
      row.push(productKey[i]);

      // categories
      var catArr = []

      catArr.push(category[i]);

      if (markets[i] != ""){
        var marketsArr = markets[i].split(",")
        for (j = 0; j < marketsArr.length; j++){
          if (marketsArr[j] == "PotableWater"){
            marketsArr[j] = "Potable Water"
          }
          if (marketsArr[j] == "MiningQuarry"){
            marketsArr[j] = "Mining & Quarry"
          }
          catArr.push("Markets" + " > " + marketsArr[j])
        }
      }

      row.push(catArr.join(", "))

      // prices, dimensions
      if (price[i] == 0){
        price[i] = '';
      }
      row.push(price[i])
      if (weight[i] == 0){
        weight[i] = '';
      }
      row.push(weight[i]);
      if (width[i] == 0){
        width[i] = '';
      }
      row.push(width[i]);
      if (height[i] == 0){
        height[i] = '';
      }
      row.push(height[i]);
      if (length[i] == 0){
        length[i] = '';
      }
      row.push(length[i]);

      // attributes
      for (j = 0; j < maxAtt; j++){
        if (j < attKeys[i].length){
          row.push(attKeys[i][j]);
          row.push(attVals[i][j]);
          row.push(1);
          row.push(1);
        } else {
          row.push('');
          row.push('');
          row.push('');
          row.push('');
        }
      }

      // row is slotted into the new table at the end of each loop
      newTable.push(row);
    }
  }
  filename = "Woocommerce.csv";
  obj.data = newTable;
  console.log(newTable);
  return obj;
}

// creates PriceTiers
function pricetier(obj) {
  var table = obj.data;
  console.log(table);

  var sku = makeArr('ProductCode', table);
  var name = makeArr('Name', table);
  var fixedPrice = makeArr('SupplierFixedPrice', table);

  // the first row of the new table, seven columns
  var newTable = [['Action','ProductSKU', 'ProductName', 'PriceTier', 'MarkupType', 'UseType', 'Value']];
  var value = ["60.000000", "50.000000", "45.000000", "45.000000", "35.000000"];
  for (i = 0; i < sku.length; i++){
    var useType = (fixedPrice[i] == 0) ? "Latest Price" : "Fixed Price";
    for (j = 1; j <= 5; j++){
      // each loop puts elements in the same row
      var row = ['', sku[i], name[i], j, "MarkUp %", useType, value[j - 1]];
      newTable.push(row); // row is slotted into the new table at the end of each loop
    }
  }
  filename = "PriceTiers.csv";
  obj.data = newTable;
  console.log(newTable);
  return obj;
}

function replace(obj) {
  var table = obj.data;
  console.log(table);

  var column = document.getElementById("replace-column").value;
  var target = document.getElementById("replace-target").value;
  var value = document.getElementById("replace-value").value;

  //replace
  var col = table[0].indexOf(column);
  for (i = 1; i < table.length; i++) {
    if(table[i][col]) {
      table[i][col] = table[i][col].split(target).join(value);
    }
  }
  filename = "ModifiedInv(" + value + ").csv";
  obj.data = table;
  console.log(table);
  return obj;
}

// filters inventory
function filter(obj) {
  var table = obj.data;
  console.log(table);

  var column = document.getElementById("filter-column").value;
  var values = makeArr(column, table);
  var value = document.getElementById("filter-value").value;
  if (value == ""){
    var reg = /^$/gm;
  } else {
    var reg = new RegExp(value, 'gi');
  }
  var hasVal = matchVal(reg, values);
  var newTable = [table[0]]; // the first row
  var selection = document.getElementById("filter-have").value;
  if (selection == "have"){
    for (i = 1; i <= hasVal.length; i++){
      // only adds rows with x tag
      if(hasVal[i - 1]){
        newTable.push(table[i]);
      }
    }
  } else {
    for (i = 1; i <= hasVal.length; i++){
      // only adds rows with x tag
      if(!hasVal[i - 1]){
        newTable.push(table[i]);
      }
    }
  }
  if (selection != "have"){
    value = "-" + value;
  }
  filename = "FilteredInv(" + value + ").csv";
  obj.data = newTable;
  console.log(newTable);
  return obj;
}

// returns array of bools
function matchVal(reg, vals) {
  var matches = [];
  for (i = 0; i < vals.length; i++){
    if (vals[i].match(reg)){
      matches.push(true);
    } else {
      matches.push(false)
    }
  }
  return matches;
}

// returns of array of values for any given field
function makeArr(field, table) {
  var col = table[0].indexOf(field); // Find index of field
  var valArr = [];
  for (i = 1; i < table.length; i++) {
    if (table[i][col] != null){
      valArr.push(table[i][col]);
    } else {
      valArr.push("");
    }
  }
  return valArr;
}

// downloads the csv file
function download(filename, text) {
  const fileStream = streamSaver.createWriteStream(filename, {
    size: 22, // (optional) Will show progress
    writableStrategy: undefined, // (optional)
    readableStrategy: undefined  // (optional)
  })

  new Response(text).body
    .pipeTo(fileStream)
    //.then(success, error)
}
