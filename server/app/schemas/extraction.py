from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ExtractionRecord(BaseModel):
    fileId: str = Field(..., alias="fileId")
    lob: Optional[str] = ""
    insured: Optional[str] = ""
    dba: Optional[str] = ""
    policyNumber: Optional[str] = ""
    effdate: Optional[str] = ""
    expdate: Optional[str] = ""
    carrier: Optional[str] = ""
    valuedDate: Optional[str] = ""
    claimNumber: Optional[str] = ""
    claimant: Optional[str] = ""
    claimStatus: Optional[str] = ""
    closedDate: Optional[str] = ""
    reportedDate: Optional[str] = ""
    dateOfLoss: Optional[str] = ""
    lossDescription: Optional[str] = ""
    lossLocation: Optional[str] = ""
    state: Optional[str] = ""
    city: Optional[str] = ""
    medicalPaid: Optional[str] = ""
    medicalPaid2: Optional[str] = ""
    medicalPaid3: Optional[str] = ""
    medicalReserves: Optional[str] = ""
    medicalReserves2: Optional[str] = ""
    medicalReserves3: Optional[str] = ""
    indemnityPaid: Optional[str] = ""
    indemnityPaid2: Optional[str] = ""
    indemnityPaid3: Optional[str] = ""
    indemnityPaid4: Optional[str] = ""
    indemnityPaid5: Optional[str] = ""
    indemnityPaid6: Optional[str] = ""
    indemnityReserves: Optional[str] = ""
    indemnityReserves2: Optional[str] = ""
    indemnityReserves3: Optional[str] = ""
    indemnityReserves4: Optional[str] = ""
    indemnityReserves5: Optional[str] = ""
    indemnityReserves6: Optional[str] = ""
    expensesPaid: Optional[str] = ""
    expensesPaid2: Optional[str] = ""
    expensesPaid3: Optional[str] = ""
    expensesPaid4: Optional[str] = ""
    expensesPaid5: Optional[str] = ""
    expensesPaid6: Optional[str] = ""
    expensesReserves: Optional[str] = ""
    expensesReserves2: Optional[str] = ""
    expensesReserves3: Optional[str] = ""
    expensesReserves4: Optional[str] = ""
    expensesReserves5: Optional[str] = ""
    expensesReserves6: Optional[str] = ""
    totalPaid: Optional[str] = ""
    totalPaid2: Optional[str] = ""
    totalReserve: Optional[str] = ""
    totalReserve2: Optional[str] = ""
    totalIncurredSource: Optional[str] = ""
    recoveries: Optional[str] = ""
    recoveries2: Optional[str] = ""
    recoveries3: Optional[str] = ""
    recoveries4: Optional[str] = ""
    recoveries5: Optional[str] = ""
    recoveries6: Optional[str] = ""
    totalMedical: Optional[str] = ""
    totalIndemnity: Optional[str] = ""
    totalExpenses: Optional[str] = ""
    inferredCurrency: Optional[str] = ""
    pageNumber: Optional[str] = ""
    sheetName: Optional[str] = ""

    class Config:
        populate_by_name = True


class Bounds(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None


class Citation(BaseModel):
    field: str
    page: Optional[int] = None
    bounds: Optional[Bounds] = None
    snippet: Optional[str] = None


class EditPayload(BaseModel):
    fileId: str
    field: str
    value: str


class ExtractionResponse(BaseModel):
    data: ExtractionRecord
    citations: List[Citation] = []

