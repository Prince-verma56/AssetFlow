from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time

app = Flask(__name__)
CORS(app)

def scrape_agmarknet(commodity, state, market):
    print(f"Scraping started for: {commodity}, {state}, {market}")
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    try:
        driver.get("https://agmarknet.gov.in/SearchCmmMkt.aspx")
        wait = WebDriverWait(driver, 20)
        
        # Robust Selection Helper
        def select_dropdown(id, text):
            try:
                el = wait.until(EC.presence_of_element_located((By.ID, id)))
                select = Select(el)
                # Try exact match, then partial match case-insensitive
                try:
                    select.select_by_visible_text(text)
                except:
                    found = False
                    for opt in select.options:
                        if text.lower() in opt.text.lower():
                            select.select_by_visible_text(opt.text)
                            found = True
                            break
                    if not found:
                        print(f"Warning: Could not find {text} in {id}")
            except Exception as e:
                print(f"Error selecting {id}: {e}")

        # Agmarknet sequence: State -> District (optional/auto) -> Market -> Commodity
        select_dropdown("ddlState", state)
        time.sleep(1.5)
        
        # Try to select District if it's there (often matches market or needs to be set to 'Any')
        # We'll try to set it to market name first, then just skip if it fails
        select_dropdown("ddlDistrict", market)
        time.sleep(1.5)
        
        select_dropdown("ddlMarket", market)
        time.sleep(1)
        
        select_dropdown("ddlCommodity", commodity)
        time.sleep(1)
        
        # Click Go button
        print("Clicking Go...")
        go_button = wait.until(EC.element_to_be_clickable((By.ID, "btnGo")))
        go_button.click()
        
        # Wait for table
        print("Waiting for table results...")
        try:
            wait.until(EC.presence_of_element_located((By.ID, "gvAgmark")))
        except:
            print("Table not found, maybe no records for this selection.")
            return []
        
        # Parse table with BeautifulSoup
        soup = BeautifulSoup(driver.page_source, "html.parser")
        table = soup.find("table", {"id": "gvAgmark"})
        
        results = []
        if table:
            rows = table.find_all("tr")[1:] # Skip header
            print(f"Found {len(rows)} rows in table.")
            for row in rows:
                cols = row.find_all("td")
                if len(cols) >= 10:
                    data = {
                        "Min Prize": cols[7].text.strip(),
                        "Max Prize": cols[8].text.strip(),
                        "Model Prize": cols[9].text.strip(),
                        "Date": cols[10].text.strip()
                    }
                    results.append(data)
        
        print(f"Scraping finished. Results count: {len(results)}")
        return results
    except Exception as e:
        print(f"Scraping error: {e}")
        return []
    finally:
        driver.quit()

@app.route('/request', methods=['GET'])
def get_market_data():
    commodity = request.args.get('commodity')
    state = request.args.get('state')
    market = request.args.get('market')
    
    if not all([commodity, state, market]):
        return jsonify({"error": "Missing parameters"}), 400
    
    data = scrape_agmarknet(commodity, state, market)
    return jsonify(data)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
