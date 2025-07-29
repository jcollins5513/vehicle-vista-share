import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { VehicleWithMedia } from '@/types';

/**
 * Fills out the Buyers Guide PDF with vehicle-specific information
 * @param vehicle The vehicle data to use for filling the PDF
 * @returns A Uint8Array containing the filled PDF data
 */
export async function generateBuyersGuidePDF(vehicle: VehicleWithMedia): Promise<Uint8Array> {
  try {
    // Fetch the template PDF
    const templateBytes = await fetch('/Buyers_Guide_FNT_BK.pdf').then(res => 
      res.arrayBuffer()
    );
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Get the form from the PDF
    const form = pdfDoc.getForm();
    
    // Log all field names to help with debugging
    const fieldNames = form.getFields().map(field => field.getName());
    console.log('Available form fields:', fieldNames);
    
    // Fill in the dealer information
    try {
      const dealerField = form.getTextField('dealer');
      if (dealerField) dealerField.setText('Vehicle Vista Dealership');
    } catch (error) {
      console.log('Dealer field not found:', error);
    }
    
    // Enhanced list of possible field names for vehicle information
    // This includes more variations of field names that might be in the PDF
    const possibleFieldNames = {
      year: ['year', 'vehicle_year', 'veh_year', 'Year', 'YEAR', 'Vehicle Year', 'VehicleYear', 'VEHICLE YEAR'],
      make: ['make', 'vehicle_make', 'veh_make', 'Make', 'MAKE', 'Vehicle Make', 'VehicleMake', 'VEHICLE MAKE'],
      model: ['model', 'vehicle_model', 'veh_model', 'Model', 'MODEL', 'Vehicle Model', 'VehicleModel', 'VEHICLE MODEL'],
      vin: ['vin', 'vehicle_vin', 'veh_vin', 'vin#', 'VIN', 'VIN#', 'Vehicle VIN', 'VehicleVIN', 'VEHICLE IDENTIFICATION NUMBER', 'VEHICLE IDENTIFICATION NUMBER VIN', 'vehicle identification number', 'vehicle identification number vin'],
      stock: ['stock', 'stock#', 'stock_number', 'stocknumber', 'stk', 'stk#', 'Stock', 'STOCK', 'STK', 'STK#', 'Stock Number', 'StockNumber', 'STOCK NUMBER', 'Stock #', 'STOCK #', 'STK #'],
      price: ['price', 'vehicle_price', 'asking_price', 'sale_price', 'Price', 'PRICE', 'Vehicle Price', 'VehiclePrice', 'VEHICLE PRICE']
    };
    
    // Additional exact field names that might be in the specific PDF template
    const exactFieldNames = [
      'VEHICLE MAKE', 
      'VEHICLE IDENTIFICATION NUMBER VIN',
      'Stock #',
      'STK #'
    ];
    
    // Try to fill each field by checking all possible field names
    function tryFillField(fieldTypes: string[], value: string) {
      for (const fieldName of fieldTypes) {
        try {
          const field = form.getTextField(fieldName);
          if (field) {
            field.setText(value);
            console.log(`Successfully filled field: ${fieldName} with value: ${value}`);
            return true;
          }
        } catch (_) {
          // Field not found with this name, continue to next possible name
        }
      }
      return false;
    }
    
    // Try to fill in each piece of vehicle information
    const vehicleInfo = {
      year: vehicle.year.toString(),
      make: vehicle.make,
      model: vehicle.model,
      vin: vehicle.vin,
      stock: vehicle.stockNumber,
      price: `$${vehicle.price?.toLocaleString() || 'Contact for Price'}`
    };
    
    // Initialize fieldsFound before using it
    let fieldsFound = false;
    
    // Try exact field names first - these are specific to the PDF template
    for (const fieldName of exactFieldNames) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          if (fieldName === 'VEHICLE MAKE') {
            field.setText(vehicle.make);
            console.log(`Filled exact field: ${fieldName} with ${vehicle.make}`);
            fieldsFound = true;
          } else if (fieldName === 'VEHICLE IDENTIFICATION NUMBER VIN') {
            field.setText(vehicle.vin);
            console.log(`Filled exact field: ${fieldName} with ${vehicle.vin}`);
            fieldsFound = true;
          } else if (fieldName === 'Stock #' || fieldName === 'STK #') {
            field.setText(vehicle.stockNumber);
            console.log(`Filled exact field: ${fieldName} with ${vehicle.stockNumber}`);
            fieldsFound = true;
          }
        }
      } catch (error) {
        console.log(`Exact field ${fieldName} not found or not fillable:`, error);
      }
    }
    
    // Attempt to fill all fields using the possible field names
    for (const [key, value] of Object.entries(vehicleInfo)) {
      const found = tryFillField(possibleFieldNames[key as keyof typeof possibleFieldNames], value);
      fieldsFound = fieldsFound || found;
    }
    
    // If we couldn't find any fields using exact names, try a more aggressive approach
    if (!fieldsFound) {
      console.log('No standard fields found, trying more aggressive pattern matching');
      
      // Get all text fields
      const allFields = form.getFields()
        .filter(field => {
          // Make sure we're only dealing with text fields
          try {
            return field.constructor.name === 'PDFTextField';
          } catch (error) {
            console.log('Error checking field type:', error);
            return false;
          }
        })
        .map(field => {
          try {
            return {
              name: field.getName(),
              field: field
            };
          } catch (error) {
            console.log('Error getting field name:', error);
            return null;
          }
        })
        .filter(item => item !== null) as { name: string, field: any }[];
      
      console.log('All text fields found:', allFields.map(f => f.name));
      
      // Try to match fields by partial name (case insensitive)
      for (const [key, value] of Object.entries(vehicleInfo)) {
        // Create a list of keywords to look for in field names
        const keywords = [key];
        if (key === 'stock') keywords.push('stk', 'stock#', 'stk#');
        if (key === 'vin') keywords.push('vin#');
        
        // Find fields that might match our data
        const matchingFields = allFields.filter(item => 
          keywords.some(keyword => 
            item.name.toLowerCase().includes(keyword.toLowerCase())
          )
        );
        
        console.log(`Potential matches for ${key}:`, matchingFields.map(f => f.name));
        
        // Try to fill each matching field
        for (const item of matchingFields) {
          try {
            const field = form.getTextField(item.name);
            field.setText(value);
            console.log(`Filled field by pattern matching: ${item.name} with value: ${value}`);
            fieldsFound = true;
          } catch (error) {
            console.log(`Error filling field ${item.name}:`, error);
          }
        }
      }
    }
    
    // If we still couldn't find any fields, try a last resort approach - try all text fields
    if (!fieldsFound) {
      console.log('Pattern matching failed, trying all text fields');
      
      // Get all form fields
      const allFields = form.getFields();
      
      // Try to identify fields by position or other attributes
      for (const field of allFields) {
        try {
          const fieldName = field.getName();
          const fieldType = field.constructor.name;
          
          // Skip non-text fields
          if (fieldType !== 'PDFTextField') continue;
          
          console.log(`Examining field: ${fieldName} (${fieldType})`);
          
          // Try to guess what this field is for based on its name
          const fieldNameLower = fieldName.toLowerCase();
          
          // Match field to vehicle info
          if (fieldNameLower.includes('make') || fieldName === 'VEHICLE MAKE') {
            form.getTextField(fieldName).setText(vehicle.make);
            console.log(`Filled make field: ${fieldName} with ${vehicle.make}`);
            fieldsFound = true;
          } else if (fieldNameLower.includes('model')) {
            form.getTextField(fieldName).setText(vehicle.model);
            console.log(`Filled model field: ${fieldName} with ${vehicle.model}`);
            fieldsFound = true;
          } else if (fieldNameLower.includes('year')) {
            form.getTextField(fieldName).setText(vehicle.year.toString());
            console.log(`Filled year field: ${fieldName} with ${vehicle.year}`);
            fieldsFound = true;
          } else if (fieldNameLower.includes('vin') || fieldNameLower.includes('identification')) {
            form.getTextField(fieldName).setText(vehicle.vin);
            console.log(`Filled VIN field: ${fieldName} with ${vehicle.vin}`);
            fieldsFound = true;
          } else if (fieldNameLower.includes('stock') || fieldNameLower.includes('stk') || fieldName === 'Stock #' || fieldName === 'STK #') {
            form.getTextField(fieldName).setText(vehicle.stockNumber);
            console.log(`Filled stock field: ${fieldName} with ${vehicle.stockNumber}`);
            fieldsFound = true;
          } else if (fieldNameLower.includes('price')) {
            form.getTextField(fieldName).setText(`$${vehicle.price?.toLocaleString() || 'Contact for Price'}`);
            console.log(`Filled price field: ${fieldName} with ${vehicle.price}`);
            fieldsFound = true;
          }
        } catch (e) {
          console.log('Error processing field:', e);
        }
      }
    }
    
    // If we still couldn't find any fields, add text directly to the PDF
    if (!fieldsFound) {
      console.log('No form fields found or accessible, using direct text placement');
      
      // Get fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      console.log(`PDF dimensions: ${width} x ${height}`);
      
      // Try multiple positions for the text to increase chances of hitting the right spot
      // These are common positions for form fields in standard buyers guides
      
      // Vehicle year, make, model - try multiple positions
      const yPositions = [
        height - 190, // Original position
        height - 250, // Lower position
        height - 300, // Even lower
        height * 0.75, // 3/4 down the page
        height * 0.5,  // Middle of page
      ];
      
      const xPositions = [
        70,           // Original position
        width * 0.25, // 1/4 across
        width * 0.5,  // Middle
      ];
      
      // Try multiple positions for year, make, model
      for (const y of yPositions) {
        for (const x of xPositions) {
          firstPage.drawText(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, {
            x: x,
            y: y,
            size: 12,
            font: helveticaBold,
            color: rgb(0, 0, 0),
          });
        }
      }
      
      // VIN - try multiple positions
      for (const y of yPositions.map(y => y - 20)) {
        for (const x of xPositions) {
          firstPage.drawText(`VIN: ${vehicle.vin}`, {
            x: x,
            y: y,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }
      }
      
      // Stock number - try multiple positions
      for (const y of yPositions.map(y => y - 40)) {
        for (const x of xPositions) {
          firstPage.drawText(`Stock #: ${vehicle.stockNumber}`, {
            x: x,
            y: y,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }
      }
      
      // Price - try multiple positions
      for (const y of [height - 190, height - 350, height * 0.6]) {
        for (const x of [width - 200, width * 0.75, width * 0.5]) {
          firstPage.drawText(`Price: $${vehicle.price?.toLocaleString() || 'Contact for Price'}`, {
            x: x,
            y: y,
            size: 14,
            font: helveticaBold,
            color: rgb(0, 0, 0),
          });
        }
      }
    }
    
    // Flatten the form (makes the filled fields non-editable)
    form.flatten();
    
    // Serialize the PDFDocument to bytes
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating Buyers Guide PDF:', error);
    throw new Error('Failed to generate Buyers Guide PDF');
  }
}

/**
 * Creates a downloadable blob URL for the generated PDF
 * @param pdfBytes The PDF data as a Uint8Array
 * @returns A URL that can be used to download the PDF
 */
export function createPDFBlobUrl(pdfBytes: Uint8Array): string {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
