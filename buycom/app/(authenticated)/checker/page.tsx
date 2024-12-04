'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import API_URL from '@/config'

import { UserOptions as AutoTableUserOptions } from 'jspdf-autotable'

interface AutoTableOptions extends Omit<AutoTableUserOptions, 'theme'> {
    startY: number;
    head: string[][];
    body: string[][];
    theme?: 'striped' | 'grid' | 'plain' | 'css';
}

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: AutoTableOptions) => jsPDF;
        lastAutoTable?: {
            finalY: number;
        };
    }
}


interface Company {
    id?: number;
    gstin?: string;
    legal_name?: string;
    state?: string;
    result?: string;
    fetch_date?: string;
    registration_date?: string;
    last_update?: string;
    trade_name?: string;
    company_type?: string;
    delayed_filling?: string;
    Delay_days?: string;
    address?: string;
    return_status?: string;
    month?: string;
    year?: string;
    date_of_filing?: string;
    return_type?: string;
}

export default function UserDashboard() {
    const [allData, setAllData] = useState<Company[]>([])
    const [displayData, setDisplayData] = useState<Company[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [itemsPerPage] = useState(5)
    const [editingId, setEditingId] = useState<number | null>(null)
    const router = useRouter()
    const [error, setError] = useState('');
    const [newStatus, setNewStatus] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        legal_name: '',
        gstin: '',
        state: '',
        status: 'all',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: keyof Company; direction: 'ascending' | 'descending' } | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('auth_tokens')
        const userRole = localStorage.getItem('user_role')

        if (!token || userRole !== 'admin') {
            router.push('/')
        } else {
            setIsAuthenticated(true)
            setIsAdmin(true)
            fetchData()
        }
    }, [router])

    const fetchData = async () => {
        try {
            const response = await fetch(`${API_URL}/companies/`)
            if (response.ok) {
                const data: Company[] = await response.json()
                const uniqueData: Company[] = Array.from(new Map(data.map(item => [item.gstin, item])).values())
                setAllData(uniqueData)
            } else {
                console.error("Failed to fetch data")
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        }
    }

    useEffect(() => {
        let filteredData = allData.filter(item =>
            (filters.legal_name === '' || item.legal_name?.toLowerCase().includes(filters.legal_name.toLowerCase())) &&
            (filters.gstin === '' || item.gstin?.toLowerCase().includes(filters.gstin.toLowerCase())) &&
            (filters.state === '' || item.state?.toLowerCase().includes(filters.state.toLowerCase())) &&
            (filters.status === 'all' || item.result === filters.status)
        )

        if (searchQuery) {
            filteredData = filteredData.filter(item =>
                item.gstin?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Apply sorting
        if (sortConfig !== null) {
            filteredData.sort((a, b) => {
                if (a[sortConfig.key] == null && b[sortConfig.key] == null) {
                    return 0;
                }
                if (a[sortConfig.key] == null) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                if (b[sortConfig.key] == null) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key]! < b[sortConfig.key]!) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key]! > b[sortConfig.key]!) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        setDisplayData(filteredData)
        setCurrentPage(1)
    }, [filters, searchQuery, allData, sortConfig])

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = displayData.slice(indexOfFirstItem, indexOfLastItem)

    const validateGST = (gstNumber: string) => {
        // Example GST validation regex for India (15 alphanumeric characters starting with digits, ending with a letter)
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/i;
        return gstRegex.test(gstNumber);
    };

    const handleSubmit = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        setError(''); // Clear any previous errors

        if (!searchQuery) {
            setError('GST Number is required.');
            return;
        }

        if (!validateGST(searchQuery)) {
            setError('Invalid GST Number. Please enter a valid GSTIN.');
            return;
        }

        // If validation passes, proceed with the search
        console.log('Valid GST Number:', searchQuery);
        alert(`Searching for GST Number: ${searchQuery}`);
    };

    const filterDataForPDF = async (gstin: string): Promise<Company | null> => {
        try {
            const response = await fetch(`${API_URL}/companies/${gstin}/`)
            if (response.ok) {
                const data = await response.json()
                return data || null
            } else {
                console.error("Failed to fetch company data")
                return null
            }
        } catch (error) {
            console.error("Error fetching company data:", error)
            return null
        }
    }

    const getMonthName = (monthNumber: string): string => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const monthIndex = parseInt(monthNumber, 10) - 1;
        return months[monthIndex] || 'N/A';
    };

    const handleSaveChanges = async () => {
        if (editingId !== null) {
            const selectedItem = allData.find(item => item.id === editingId);
            if (!selectedItem) {
                console.error("Selected item not found");
                return;
            }

            const bodyData = {
                id: editingId,
                gstin: selectedItem.gstin,
                status: newStatus || selectedItem.result,
                // annual_turnover: newAnnualTurnover ? parseFloat(newAnnualTurnover) : selectedItem.annual_turnover,
            };

            try {
                setIsLoading(true);
                const response = await fetch(`${API_URL}/update_status_for_gstin/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bodyData),
                });

                if (response.ok) {
                    console.log("Record updated successfully");
                    await fetchData();
                } else {
                    console.error("Failed to update record");
                }
            } catch (error) {
                console.error("Error updating record:", error);
            }
            setIsLoading(false);
            setEditingId(null);
            setNewStatus('');
            // setNewAnnualTurnover('');
        }
    };

    const handleStatusChange = (value: string) => {
        setNewStatus(value)
    }

    // Main PDF generation function
    const generatePDF = async (gstin: string) => {
        setIsLoading(true);
        try {
            // Fetch the filtered data
            const items = await filterDataForPDF(gstin);
            console.log("items:", items);

            // Check if there are any records
            if (!Array.isArray(items) || items.length === 0) {
                console.error("No data found for the provided GSTIN or array is empty");
                setIsLoading(false);
                return;
            }

            // Initialize jsPDF
            const doc = new jsPDF();

            // Add header text
            doc.setFontSize(24);
            doc.text("COMPANY GST3B SUMMARY", 50, 15);
            doc.setFontSize(10);

            // Add summary data as a table
            const summaryTableData = [
                ["GSTIN", items[0].gstin || "N/A", "STATUS", items[0].return_status || "N/A"],
                ["LEGAL NAME", items[0].legal_name || "N/A", "REG. DATE", items[0].registration_date || "N/A"],
                ["TRADE NAME", items[0].trade_name || "N/A", "LAST UPDATE DATE", items[0].last_update || "N/A"],
                ["COMPANY TYPE", items[0].company_type || "N/A", "STATE", items[0].state || "N/A"],
                ["% DELAYED FILLING", items[0].delayed_filling || "N/A", "AVG. DELAY DAYS", items[0].Delay_days || "N/A"],
                ["Address", items[0].state || "N/A", "Result", items[0].result || "N/A"],
            ];

            doc.autoTable({
                startY: 20,
                head: [["", "", "", ""]],
                body: summaryTableData,
                theme: "grid",
                headStyles: { fillColor: [230, 230, 230] },
                styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
                columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 70 }, 2: { cellWidth: 45 }, 3: { cellWidth: 30 } },
            });

            // Get the Y position for the next table
            let yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 20;

            // Sorting logic for all items
            items.sort((a, b) => {
                const yearA = parseInt(a.year || "0", 10);
                const yearB = parseInt(b.year || "0", 10);
                const monthA = parseInt(a.month || "0", 10);
                const monthB = parseInt(b.month || "0", 10);

                if (yearA > yearB) return -1;
                if (yearA < yearB) return 1;
                if (monthA > monthB) return -1;
                if (monthA < monthB) return 1;

                return 0;
            });

            if (items.length > 24) {
                items.splice(24);
            }
            // Prepare sorted data for tables
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prepareTableData = (records: any[]) =>
                records.map((item) => [
                    item.year || "N/A",
                    getMonthName(item.month || "N/A"),
                    item.return_type || "N/A",
                    item.date_of_filing || "N/A",
                    item.delayed_filling || "N/A",
                    item.Delay_days || "N/A",
                ]);

            // Separate GSTR3B and other records
            const gstr3bRecords = items.filter((item) => item.return_type === "GSTR3B");
            const otherRecords = items.filter((item) => item.return_type !== "GSTR3B");

            // Prepare table data
            const gstr3bTableData = prepareTableData(gstr3bRecords);
            const otherTableData = prepareTableData(otherRecords);

            // Add GSTR3B records table
            if (gstr3bTableData.length > 0) {
                doc.autoTable({
                    startY: yPos,
                    head: [["Year", "Month", "Return Type", "Date of Filing", "Delayed Filing", "Delay Days"]],
                    body: gstr3bTableData,
                    theme: "grid",
                    headStyles: { fillColor: [230, 230, 230] },
                    styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
                    columnStyles: {
                        0: { cellWidth: 30 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 35 },
                        5: { cellWidth: 30 },
                    },
                });
                // yPos = doc.lastAutoTable.finalY + 20;
                yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 20 : 30;

            }

            // Add Other records table
            if (otherTableData.length > 0) {
                doc.setFontSize(24);
                doc.text("Other Records", 80, yPos - 5);
                doc.autoTable({
                    startY: yPos,
                    head: [["Year", "Month", "Return Type", "Date of Filing", "Delayed Filing", "Delay Days"]],
                    body: otherTableData,
                    theme: "grid",
                    headStyles: { fillColor: [230, 230, 230] },
                    styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
                    columnStyles: {
                        0: { cellWidth: 30 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 35 },
                        5: { cellWidth: 30 },
                    },
                });
            }

            // Save the PDF
            doc.save(`${gstin}_summary.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSort = (key: keyof Company) => {
        setSortConfig(prevConfig => {
            if (!prevConfig || prevConfig.key !== key) {
                return { key, direction: 'ascending' };
            }
            if (prevConfig.direction === 'ascending') {
                return { key, direction: 'descending' };
            }
            return null;
        });
    };

    if (!isAuthenticated || !isAdmin) {
        return <div>Loading...</div>
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4 mb-6">
                <div className="flex space-x-4">
                    <input
                        type="text"
                        placeholder="Enter GST Number"
                        className={`flex-grow p-2 border ${error ? 'border-red-500' : 'border-gray-300'
                            } rounded-md`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="bg-[#0f172b] text-white px-4 py-2 rounded-md hover:bg-#0f172b"
                    >
                        Search
                    </button>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
            </form>


            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                    placeholder="Filter by Company Name"
                    value={filters.legal_name}
                    onChange={(e) => handleFilterChange('legal_name', e.target.value)}
                />
                <Input
                    placeholder="Filter by GSTIN"
                    value={filters.gstin}
                    onChange={(e) => handleFilterChange('gstin', e.target.value)}
                />
                <Input
                    placeholder="Filter by State"
                    value={filters.state}
                    onChange={(e) => handleFilterChange('state', e.target.value)}
                />
                <Select onValueChange={(value) => handleFilterChange('status', value)} value={filters.status}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Pass">Pass</SelectItem>
                        <SelectItem value="Fail">Fail</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead onClick={() => handleSort('legal_name')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Company Name
                                    {sortConfig?.key === 'legal_name'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('gstin')} className="cursor-pointer">
                                <div className="flex items-center">
                                    GSTIN
                                    {sortConfig?.key === 'gstin'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('state')} className="cursor-pointer">
                                <div className="flex items-center">
                                    State
                                    {sortConfig?.key === 'state'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('fetch_date')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Fetch Date
                                    {sortConfig?.key === 'fetch_date'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('Delay_days')} className="
cursor-pointer">
                                <div className="flex items-center">
                                    Delay Days %
                                    {sortConfig?.key === 'Delay_days'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('delayed_filling')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Delayed Filling
                                    {sortConfig?.key === 'delayed_filling'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('result')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Status
                                    {sortConfig?.key === 'result'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.legal_name}</TableCell>
                                <TableCell>{item.gstin}</TableCell>
                                <TableCell>{item.state}</TableCell>
                                <TableCell>{item.fetch_date}</TableCell>
                                <TableCell>{item.Delay_days}</TableCell>
                                <TableCell>{item.delayed_filling}</TableCell>
                                <TableCell>{item.result}</TableCell>
                                <TableCell>
                                    <Button variant="outline" size="sm" onClick={() => generatePDF(item.gstin || '')} className="mr-2" type="submit" disabled={isLoading}>
                                        {isLoading ? (
                                            <img src="/gif/loading.gif" alt="Loading..." className="w-16 h-6" />
                                        ) : (
                                            "Download"
                                        )}
                                    </Button>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" onClick={() => setEditingId(item.id || null)} size="sm">Edit</Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Edit Company Details</DialogTitle>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <label htmlFor="status" className="text-right">
                                                        Status
                                                    </label>
                                                    <Select onValueChange={handleStatusChange} defaultValue={item.result}>
                                                        <SelectTrigger className="col-span-3">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Pass">Pass</SelectItem>
                                                            <SelectItem value="Fail">Fail</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                            </div>
                                            <div className="flex justify-end space-x-4">
                                                <Button type="submit" disabled={isLoading} onClick={handleSaveChanges}>
                                                    {isLoading ? (
                                                        <img src="/gif/loading.gif" alt="Loading..." className="w-6 h-6" />
                                                    ) : (
                                                        "Save Changes"
                                                    )}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-4 flex justify-center space-x-2">
                <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                    Previous
                </Button>
                {Array.from({ length: Math.ceil(displayData.length / itemsPerPage) }).map((_, index) => (
                    <Button
                        key={index}
                        variant={currentPage === index + 1 ? "default" : "outline"}
                        onClick={() => paginate(index + 1)}
                    >
                        {index + 1}
                    </Button>
                ))}
                <Button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === Math.ceil(displayData.length / itemsPerPage)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

