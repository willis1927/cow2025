import './App.css';
import WineList from './WineList.csv'
import { useState, useEffect, useRef } from 'react';  
import Papa from 'papaparse';
import {toast, Toaster} from 'sonner';


function App() {
  
  const [ammending, setAmmending] = useState(false);
  const [data, setData] = useState([]);
  const [inputValue, setInputValue] = useState("");
  let suggestions = [];
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [selectedValue, setSelectedValue] = useState({});
  const [orderQty, setOrderQty] = useState(0);
  const [basket, setBasket] = useState(() => {
    const saved = localStorage.getItem("COWbasket");
    if (saved) {
      return JSON.parse(saved);
    } else {
      return [];
    }});
  const [bottlesInBasket, setBottlesInBasket] = useState(parseInt(0));
  const [orderTotal, setOrderTotal] = useState(0);
  const [customerDetails, setCustomerDetails] = useState(() => {
    const saved = localStorage.getItem("COWcustomerDetails")
    if (saved) {
      return JSON.parse(saved)
    } else {
      return {name: "", email: "", phone: ""}
    };
})

  const dialogRef = useRef(null)
  const [dialogContent, setDialogContent] = useState(null)
  const [index, setIndex] =useState(null)
  
  const toggleDialog = () =>{
    if(!dialogRef.current){
      return;
    }
    dialogRef.current.hasAttribute("open")
    ? dialogRef.current.close()
    : dialogRef.current.showModal()
  }

  useEffect(() => {
    setOrderTotal(basket.map(item => (bottlesInBasket >= 6 ? item["6Price"] : item["1Price"]) * item.Qty).reduce((a, b) => parseFloat(a) + parseFloat(b), 0).toFixed(2) || 0);
  }, [basket, bottlesInBasket]);
  useEffect(() => {
    setBottlesInBasket(basket.map(item => item.Qty).reduce((a, b) => parseInt(a) + parseInt(b), 0) || 0);
  }, [basket]);

  const sendOrder = () => {
    const order = {}
    
    order.basket = basket
    order.bottlesInBasket = bottlesInBasket
    order.orderTotal = orderTotal
    order.name = customerDetails.name
    order.customerEmail = customerDetails.email // customers email to send copy of order to
    order.phone = customerDetails.phone
    order.email = ("events@averys.com") // internal email to send order to
    if (order.name.length === 0 || order.customerEmail.length === 0 || order.phone.length === 0) {
      toast.error("Please fill in all customer information fields");
      return;
    }
    if (basket.length === 0) {
      toast.error("Please add at least one wine to the basket");
      return;
    }
    
    submitOrder(order)
     

        };
    
    //
    async function submitOrder(order) {
      const response = fetch('https://emserv.vercel.app/', {
      method: 'POST',
      body: (JSON.stringify(order)),
      headers: {
        'Content-Type' : 'application/json'
      },
    })
    
    await toast.promise(response, {
      loading: "Sending order..",
      success: () =>{
      setBasket([])
      setBottlesInBasket(0)
      localStorage.removeItem("COWbasket");
      setCustomerDetails({name: "", email: "", phone: ""})
      localStorage.removeItem("COWcustomerDetails");
      return "Order sent successfully - Please go to the orders desk to provide delivery details and payment"},
      error:"Sorry, there was an error sending your order - please try again or come and speak to us at the orders desk"
    })
    
    

    }
     

    

    /*fetch('https://emserv.vercel.app/', {
      method: 'POST',
      body: (JSON.stringify(order)),
      headers: {
        'Content-Type' : 'application/json'
      },
    })
    .then(response => response)
    .then(data => {
      if (data.status === 200) {
        toast.success("Order sent successfully - Please go to the orders desk to provide delivery details and payment");
        setBasket([])
        setBottlesInBasket(0)
        localStorage.removeItem("COWbasket");
        setCustomerDetails({name: "", email: "", phone: ""})
        localStorage.removeItem("COWcustomerDetails");
      } else {
        toast.error("There was an error sending your order - please try again come to speak to us at the orders desk")
      }
      
    })
    .catch((error) => {
      console.error('Error:', error);
    }); */
   

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setFilteredSuggestions(
      suggestions.filter(suggestion => 
       suggestion.toLowerCase().includes(value.toLowerCase())
      )
    );
    if (filteredSuggestions.length === 1 && filteredSuggestions[0].toLowerCase() === value.toLowerCase()) {
      setSelectedValue(data.find(item => item.Wine.toLowerCase() === value.toLowerCase()));
      setFilteredSuggestions([]);
    } else {
      setSelectedValue({});
    }
    if (inputValue.length === 0) {
      setFilteredSuggestions([]);
      setSelectedValue({});
    }
  }

  const handleSelect = (value) => {
    console.log("Selected: ",value);
    setInputValue(value);
    let searchVal = value.split(" - ")[0];
    setSelectedValue(data.find(item => item.Number === searchVal));
    setFilteredSuggestions([]);
    let itemInBasket = basket.find(item => item.Number === searchVal);
    if (itemInBasket) {
      console.log("Item already in basket, ammending")
      setAmmending(true);
      
      setOrderQty(itemInBasket.Qty);
    }
    
    const input = document.getElementById('wine-search-input');
    if (input) input.blur(); // closes keyboard on mobile
  }

  const addToBasket = () => {
    
    
    if (Object.keys(selectedValue).length === 0 || orderQty <= 0) {
      toast.error("Please select a wine and enter a valid quantity");
      return;
    }
    if (ammending) {
      setAmmending(false);
      clearSelection()
      return;
    }
    if (basket.find(item => item.Number === selectedValue.Number)) {
      toast.error("This wine is already in the basket - please ammend the quantity there if you wish to change it");
      return;
    }
    setBasket([...basket,{...selectedValue, "Qty":orderQty}])
    localStorage.setItem('COWbasket', JSON.stringify([...basket,{...selectedValue, "Qty":orderQty}]));
    clearSelection()
  }


  const clearSelection = () => {
    setInputValue("")
        setSelectedValue({})
        setOrderQty(0)
  }
  //load and parse CSV file
  useEffect(() => {
      const fetchData = async () => {
      const response = await fetch(WineList);
      const reader = response.body.getReader();
      const result = await reader.read(); // raw array
      const decoder = new TextDecoder('utf-8');
      const csv = decoder.decode(result.value); // the csv text
      const parsedData = Papa.parse(csv, 
        { header: true ,
          skipEmptyLines: true
        }).data; // object with { data, errors, meta }
      setData(parsedData); // array of objects
      //console.log(parsedData);
      
    }
    fetchData();
  }, []); // runs once on component mount
  // prepare suggestions list when data is loaded
  useEffect(() => {
    
    if (ammending) {
      let updatedBasket = basket.map(item => {
        if (item.Number === selectedValue.Number) {
          return {...item, Qty: orderQty};
        } else {
          return item;
        }
      });
      setBasket(updatedBasket);
      localStorage.setItem('COWbasket', JSON.stringify(updatedBasket));
    }
  }, [orderQty ,ammending, selectedValue]);
    
    suggestions = data.map(item => `${item.Number} - ${item.Wine}`);
  return (
    <div className="App">
  <div className="App-header" >
  <img src="/AverysLogo.png" className="App-logo" alt="logo" />
  </div>

        <h1> Averys Celebration of Wine <br></br>Order Submission</h1>
        <div className="customer-info-form">
          <div className="form-group">
            <label htmlFor="name-input">Name</label>
            <input id="name-input" type="text" placeholder="Name" value={customerDetails.name} onChange={e => {
              let updatedDetails = {...customerDetails, name: e.target.value}
              setCustomerDetails(updatedDetails)
              localStorage.setItem("COWcustomerDetails", JSON.stringify(updatedDetails))
            }}/>
          </div>
          <div className="form-group">
            <label htmlFor="email-input">Email</label>
            <input id="email-input" type="email" placeholder="Email" value={customerDetails.email} onChange= {e =>  {
              let updatedDetails = {...customerDetails, email: e.target.value}
              setCustomerDetails(updatedDetails)
              localStorage.setItem("COWcustomerDetails", JSON.stringify(updatedDetails))   
            }}/>
          </div>
          <div className="form-group">
            <label htmlFor="phone-input">Phone</label>
            <input id="phone-input" type="tel" placeholder="Phone" value={customerDetails.phone} onChange={e => {
              let updatedDetails = {...customerDetails, phone: e.target.value}
              setCustomerDetails(updatedDetails)
              localStorage.setItem("COWcustomerDetails", JSON.stringify(updatedDetails))
            }}/>
          </div>
        </div>
        <hr />
         <div className='autocomplete-container'>
       
          <input 
          className="autocomplete-input"
          type="search"
          value={inputValue}
          onChange={handleChange}
          placeholder="Search by wine number or name..."
          id='wine-search-input'
          onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth' ,block: 'start'})}
          
        />
        
        <ul className="autocomplete-suggestions" hidden={filteredSuggestions.length === 0}>
          {filteredSuggestions.map((suggestion, index) => (
            <a href="#selectContainer" ><li
              className='autocomplete-suggestion' 
              key={index} 
              onClick={() => handleSelect(suggestion)}>
              {suggestion}
              </li></a>
          ))}
          </ul>
        </div>
      
         <div hidden={!selectedValue.Wine} id= "selectContainer" className='selectedContainer'>
          <h2>{selectedValue.Wine} {selectedValue.Vintage}</h2>
          <p>Table  - {selectedValue.Table}</p>
          <p> Wine - {selectedValue.Number} </p>
          <p>1-5 Bottles - £{Number(selectedValue["1Price"]).toFixed(2)}</p>
          <p>6+ Bottles - £{Number(selectedValue["6Price"]).toFixed(2)}</p>
        <div className='qtyInput-container'>
        <input type="number" id='qtyInput' min= "0" value={orderQty} onChange={(e) => setOrderQty(e.target.value)} placeholder='0' />
        </div>
        <button id="decrease" className="qty-button" onClick={()=>{setOrderQty(
          orderQty <= 1 ? "" : parseInt(orderQty) - 1
        )}}>-</button>
        <button id="increase" className="qty-button" onClick={()=>{setOrderQty(
            orderQty === "" ? 1 : parseInt(orderQty) + 1
        )}}>+</button>
        
        <button id="clearSelection" onClick={clearSelection} hidden={ammending}>Clear</button>
        
        </div>
         <div hidden={!selectedValue.Wine}> <button className="commitBtn" onClick = {() =>{
          addToBasket()
          
        }}>{!ammending?"Add":"Update"}</button>
        </div>
      
        
       
        <div id="basket-container" >
        <h3>Basket - {bottlesInBasket} bottles    Order Total - £{orderTotal}</h3>
        
        <table id="basket-table" hidden={basket.length === 0}>
          <thead>
            <tr>
              
              <th>Wine</th>
             
              <th>Qty</th>
              <th>Bottle Price</th>
              <th>Line Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {basket.map((item, index) => (
              <tr className ={ selectedValue.SKU === item.SKU? "ammendingRow" : ""} 
             key={item.SKU} onClick={() => {
              if(selectedValue.SKU === item.SKU){
                setSelectedValue({})
                setInputValue("")
                return
              }
              handleSelect(`${item.Number} - ${item.Wine}`)
              
              }}>
                
                <td >{item.Wine}</td>
                
                <td>{item.Qty}</td>
                <td>£{(bottlesInBasket >= 6 ? item["6Price"] : item["1Price"])}</td>
                <td>£{Number((bottlesInBasket >= 6 ? item["6Price"] : item["1Price"]) * item.Qty).toFixed(2)}</td>
                <td><button id="removeBtn" onClick={() => {
                  setDialogContent(`Are you sure you want to remove ${item.Wine}?`)
                  setIndex(index)
                  toggleDialog()



                  // if (window.confirm(`Are you sure you want to remove ${item.Wine}?`)) {
                  // const newBasket = basket.filter((_, i) => i !== index);
                  // setBasket(newBasket);
                  // localStorage.setItem('COWbasket', JSON.stringify(newBasket));
                  // }
                }}>X</button></td>
              </tr>

            ))}

          </tbody>
        </table>
        <button className="commitBtn" id="submitOrder" disabled={basket.length === 0} onClick={()=>{sendOrder()}}>Send Order</button>
        </div>
        <Toaster position="bottom-center" richColors />
    
    <dialog className="popMessage" ref={dialogRef} onClick={(e) => {
      if (e.currentTarget === e.target){
        toggleDialog();}
    }}>
      {dialogContent}<br></br>
      <button onClick={()=>{
        const newBasket = basket.filter((_, i) => i !== index);
        setBasket(newBasket);
        if (selectedValue.Wine === basket[index].Wine) {
           setSelectedValue({})}
        setInputValue("");
        setOrderQty(0);
        setAmmending(false)
        localStorage.setItem('COWbasket', JSON.stringify(newBasket));
        toggleDialog()
      }}>Yes</button>
      <button onClick={toggleDialog}>No</button>
    </dialog>
    </div>
  );
}

export default App;