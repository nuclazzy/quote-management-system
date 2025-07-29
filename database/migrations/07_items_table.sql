-- Add items table and related fields

-- Items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  min_quantity INTEGER DEFAULT 0,
  max_quantity INTEGER DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  barcode TEXT,
  sku TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add item_id to quote_items table
ALTER TABLE quote_items ADD COLUMN item_id UUID REFERENCES items(id);

-- Update suppliers table with additional fields
ALTER TABLE suppliers ADD COLUMN business_number TEXT;
ALTER TABLE suppliers ADD COLUMN category TEXT;
ALTER TABLE suppliers ADD COLUMN payment_terms TEXT;

-- Update customers table with additional fields  
ALTER TABLE customers ADD COLUMN business_number TEXT;

-- Create indexes for items
CREATE INDEX idx_items_company_id ON items(company_id);
CREATE INDEX idx_items_supplier_id ON items(supplier_id);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_sku ON items(sku);
CREATE INDEX idx_quote_items_item_id ON quote_items(item_id);

-- Add updated_at trigger for items
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();