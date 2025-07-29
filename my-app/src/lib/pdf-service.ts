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
    } catch (e) {
      console.log('Dealer field not found');
    }
    
    // Fill in the vehicle information
    // Common field names for vehicle information
    const possibleFieldNames = {
      year: ['year', 'vehicle_year', 'veh_year'],
      make: ['make', 'vehicle_make', 'veh_make'],
      model: ['model', 'vehicle_model', 'veh_model'],
      vin: ['vin', 'vehicle_vin', 'veh_vin', 'vin#'],
      stock: ['stock', 'stock#', 'stock_number', 'stocknumber', 'stk', 'stk#'],
      price: ['price', 'vehicle_price', 'asking_price', 'sale_price']
    };
    
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
        } catch (e) {
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
    
    // Attempt to fill all fields
    let fieldsFound = false;
    for (const [key, value] of Object.entries(vehicleInfo)) {
      const found = tryFillField(possibleFieldNames[key as keyof typeof possibleFieldNames], value);
      fieldsFound = fieldsFound || found;
    }
    
    // If we couldn't find any fields, try a different approach - look for fields with similar names
    if (!fieldsFound) {
      console.log('No standard fields found, trying pattern matching');
      
      // Get all text fields
      const allFields = form.getFields()
        .filter(field => field.constructor.name === 'PDFTextField')
        .map(field => field.getName());
      
      // Try to match fields by partial name
      for (const [key, value] of Object.entries(vehicleInfo)) {
        const matchingFields = allFields.filter(name => 
          name.toLowerCase().includes(key.toLowerCase())
        );
        
        for (const fieldName of matchingFields) {
          try {
            const field = form.getTextField(fieldName);
            field.setText(value);
            console.log(`Filled field by pattern matching: ${fieldName} with value: ${value}`);
            fieldsFound = true;
          } catch (e) {
            // Skip if error
          }
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
      
      // Add vehicle information directly to the page
      // These positions are estimates and may need adjustment based on the actual PDF layout
      
      // Vehicle year, make, model
      firstPage.drawText(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, {
        x: 70,
        y: height - 190,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      
      // VIN
      firstPage.drawText(`VIN: ${vehicle.vin}`, {
        x: 70,
        y: height - 210,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      // Stock number
      firstPage.drawText(`Stock #: ${vehicle.stockNumber}`, {
        x: 70,
        y: height - 230,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      // Price
      firstPage.drawText(`Price: $${vehicle.price?.toLocaleString() || 'Contact for Price'}`, {
        x: width - 200,
        y: height - 190,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
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
