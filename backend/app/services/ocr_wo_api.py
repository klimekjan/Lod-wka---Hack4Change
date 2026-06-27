import json
import easyocr
import re

def ocr_custom(obrazek):
    reader = easyocr.Reader(['pl'], gpu=False)

    # 1. Pobierasz listę linii z obrazka (dzięki detail=0 to czysta lista stringów)
    wyniki = reader.readtext(obrazek, detail=0)
    wyniki = "\n".join(wyniki)

    # Wycinamy blok od "Nief" do końca pliku (re.search łapie wszystko za "Nief")
    blok_wzorzec = r"(?i)Nief.*?\n(.*)"
    dopasowanie_bloku = re.search(blok_wzorzec, wyniki, re.DOTALL)

    lista_produktow = []

    if dopasowanie_bloku:
        czysty_blok = dopasowanie_bloku.group(1)
        
        # regex szuka ciągu liter na początku każdej linii
        wzorzec_produktu = r"^([^0-9\n]+)"
        
        for m in re.finditer(wzorzec_produktu, czysty_blok, re.MULTILINE):
            cala_linia = m.group(1)
            
            # STOP: Jeśli w linii pojawia się dwukropek, kończymy zbieranie produktów
            if ":" in cala_linia:
                break
                
            nazwa = cala_linia.strip()
            if nazwa:
                lista_produktow.append(nazwa)

    return lista_produktow