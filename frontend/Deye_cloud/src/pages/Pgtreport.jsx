import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "./pgtreport.css";

import MainLogo from "../assets/main logo.png";
import SunLogo from "../assets/sunlogo.png";

import API_BASE from "./config";

import ExcelJS from "exceljs";

function PgtReport() {

    const navigate = useNavigate();

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

   const [fromTime, setFromTime] = useState("10:00");
const [toTime, setToTime] = useState("16:00");

    const [reportData, setReportData] = useState([]);

    const [totals, setTotals] = useState({
        inverterEnergyInterval: null,
        netExportEnergyInterval: null,
        poaIrradiationInterval: null
    });

    const [loading, setLoading] = useState(false);


    // =========================================================
    // GENERATE REPORT
    // =========================================================

    const generateReport = async () => {

        if (!fromDate || !toDate) {

    alert("Please select From Date and To Date.");

    return;

}


if (!fromTime || !toTime) {

    alert("Please select From Time and To Time.");

    return;

}


if (fromTime >= toTime) {

    alert("To Time must be greater than From Time.");

    return;

}

        if (fromDate !== toDate) {

            alert(
                "PGT Report currently supports one day at a time. Please select the same date."
            );

            return;

        }


        try {

            setLoading(true);


            const stationId = "61858673";


            const res = await axios.get(

    `${API_BASE}/pgt/report/${stationId}`,

    {
        params: {
            date: fromDate,
            fromTime: fromTime,
            toTime: toTime
        }
    }

);


            console.log(
                "PGT REPORT RESPONSE:",
                res.data
            );


            setReportData(
                res.data.rows || []
            );


            setTotals(
                res.data.totals || {}
            );


        }
        catch (err) {

            console.error(
                "PGT Report Error:",
                err
            );


            alert(
                "Unable to generate PGT report."
            );

        }
        finally {

            setLoading(false);

        }

    };




    // =========================================================
    // FORMAT DATE
    // =========================================================

    const formatDate = (date) => {

        if (!date) {
            return "-";
        }

        const parts = date.split("-");

        if (parts.length !== 3) {
            return date;
        }

        return `${parts[2]}-${parts[1]}-${parts[0]}`;

    };



// =====================================================
// DOWNLOAD PGT EXCEL REPORT
// =====================================================

const downloadExcel = async () => {

    if (!reportData || reportData.length === 0) {
        alert("Please generate the PGT report before downloading the Excel.");
        return;
    }

    try {

        const workbook = new ExcelJS.Workbook();

        workbook.creator =
            "SUN Industrial Automation & Solutions Pvt Ltd";

        workbook.lastModifiedBy =
            "SUN Industrial Automation & Solutions Pvt Ltd";

        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet =
            workbook.addWorksheet("PGT Data & PR");

        // =========================================================
        // COLORS
        // =========================================================

        const HEADER_BLUE = "165A91";
        const DARK_BLUE = "123B5D";
        const YELLOW = "FFFF00";
        const LIGHT_GREEN = "B7D28A";
        const LIGHT_GREY = "F7F7F7";
        const WHITE = "FFFFFF";
        const BLACK = "000000";
        const BORDER_COLOR = "000000";

        // =========================================================
        // BORDER
        // =========================================================

        const thinBorder = {
            top: {
                style: "thin",
                color: { argb: BORDER_COLOR }
            },
            left: {
                style: "thin",
                color: { argb: BORDER_COLOR }
            },
            bottom: {
                style: "thin",
                color: { argb: BORDER_COLOR }
            },
            right: {
                style: "thin",
                color: { argb: BORDER_COLOR }
            }
        };

        // =========================================================
        // COLUMN WIDTHS
        // =========================================================

        worksheet.columns = [

            { width: 8 },   // A Sl No
            { width: 14 },  // B Date
            { width: 12 },  // C Time
            { width: 13 },  // D GHI
            { width: 14 },  // E GII
            { width: 15 },  // F Module Temp
            { width: 16 },  // G Inverter Energy
            { width: 19 },  // H Inverter Interval
            { width: 17 },  // I Net Meter
            { width: 20 },  // J Net Export
            { width: 21 },  // K POA
            { width: 14 }   // L Remarks

        ];

     // =========================================================
// COMPANY HEADER - TOP
// =========================================================

worksheet.getRow(1).height = 42;
worksheet.getRow(2).height = 34;

// Gap between company header and report title
worksheet.getRow(3).height = 22;


// =========================================================
// LOAD LOGOS
// =========================================================

const loadImageBuffer = async (src) => {

    const response = await fetch(src);

    if (!response.ok) {
        throw new Error("Unable to load logo image");
    }

    return await response.arrayBuffer();
};

const nlcLogoBuffer =
    await loadImageBuffer(MainLogo);

const sunLogoBuffer =
    await loadImageBuffer(SunLogo);


// =========================================================
// ADD LOGOS
// =========================================================

const nlcLogoId =
    workbook.addImage({
        buffer: nlcLogoBuffer,
        extension: "png"
    });

const sunLogoId =
    workbook.addImage({
        buffer: sunLogoBuffer,
        extension: "png"
    });


// =====================================================
// PROFESSIONAL PDF-STYLE EXCEL HEADER
// A1:L2 ONLY
// =====================================================

// -----------------------------------------------------
// HEADER ROW HEIGHT
// -----------------------------------------------------

worksheet.getRow(1).height = 42;
worksheet.getRow(2).height = 42;


// =====================================================
// ONLY ONE MERGE
// =====================================================

// IMPORTANT:
// No G/H separate merge.
// No column-based logo/text alignment.

worksheet.mergeCells("A1:L2");


// =====================================================
// CREATE PROFESSIONAL HEADER IMAGE
// =====================================================

const createHeaderImage = async (
    nlcLogoBuffer,
    sunLogoBuffer
) => {

    // -------------------------------------------------
    // Convert ArrayBuffer -> Base64
    // -------------------------------------------------

    const bufferToBase64 = (buffer) => {

        let binary = "";

        const bytes = new Uint8Array(buffer);

        const chunkSize = 0x8000;

        for (
            let i = 0;
            i < bytes.length;
            i += chunkSize
        ) {

            binary += String.fromCharCode(
                ...bytes.subarray(
                    i,
                    Math.min(i + chunkSize, bytes.length)
                )
            );

        }

        return btoa(binary);
    };


    const nlcBase64 =
        bufferToBase64(nlcLogoBuffer);

    const sunBase64 =
        bufferToBase64(sunLogoBuffer);


    // -------------------------------------------------
    // HEADER SIZE
    // -------------------------------------------------

    const width = 1280;
    const height = 108;


    // -------------------------------------------------
    // SVG HEADER
    // -------------------------------------------------

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="${width}"
            height="${height}"
            viewBox="0 0 ${width} ${height}"
        >

            <!-- ===================================== -->
            <!-- HEADER BACKGROUND -->
            <!-- ===================================== -->

            <rect
                x="0"
                y="0"
                width="${width}"
                height="${height}"
                fill="#063B4D"
            />


            <!-- ===================================== -->
            <!-- NLC LOGO WHITE BOX -->
            <!-- ===================================== -->

            <rect
                x="20"
                y="12"
                width="76"
                height="76"
                rx="12"
                fill="#FFFFFF"
            />


            <!-- ===================================== -->
            <!-- NLC LOGO -->
            <!-- ===================================== -->

            <image
                href="data:image/png;base64,${nlcBase64}"
                x="32"
                y="24"
                width="52"
                height="52"
                preserveAspectRatio="xMidYMid meet"
            />


            <!-- ===================================== -->
            <!-- NLC TEXT -->
            <!-- ===================================== -->

            <text
                x="116"
                y="47"
                font-family="Calibri, Arial, sans-serif"
                font-size="25"
                font-weight="700"
                fill="#FFFFFF"
            >
                NLC India Limited
            </text>

            <text
                x="116"
                y="70"
                font-family="Calibri, Arial, sans-serif"
                font-size="14"
                font-weight="600"
                fill="#D9EAF7"
            >
                Solar Dashboard
            </text>


            <!-- ===================================== -->
            <!-- VERTICAL SEPARATOR -->
            <!-- ===================================== -->

            <line
                x1="390"
                y1="25"
                x2="390"
                y2="83"
                stroke="#5F7D88"
                stroke-width="1"
            />


            <!-- ===================================== -->
            <!-- SUN LOGO WHITE BOX -->
            <!-- ===================================== -->

            <rect
                x="420"
                y="12"
                width="76"
                height="76"
                rx="12"
                fill="#FFFFFF"
            />


            <!-- ===================================== -->
            <!-- SUN LOGO -->
            <!-- ===================================== -->

            <image
                href="data:image/png;base64,${sunBase64}"
                x="432"
                y="24"
                width="52"
                height="52"
                preserveAspectRatio="xMidYMid meet"
            />


            <!-- ===================================== -->
            <!-- SUN EPC TEXT -->
            <!-- ===================================== -->

            <text
                x="515"
                y="43"
                font-family="Calibri, Arial, sans-serif"
                font-size="12"
                font-weight="600"
                fill="#D9EAF7"
            >
                EPC BY
            </text>


            <!-- ===================================== -->
            <!-- SUN COMPANY NAME -->
            <!-- ===================================== -->

            <text
                x="515"
                y="67"
                font-family="Calibri, Arial, sans-serif"
                font-size="18"
                font-weight="700"
                fill="#00E6B8"
            >
                SUN Industrial Automation &amp; Solutions Pvt Ltd
            </text>


            <!-- ===================================== -->
            <!-- BOTTOM LINE -->
            <!-- ===================================== -->

            <line
                x1="0"
                y1="107"
                x2="${width}"
                y2="107"
                stroke="#1B6074"
                stroke-width="1"
            />

        </svg>
    `;


    // -------------------------------------------------
    // SVG -> IMAGE
    // -------------------------------------------------

    const svgBlob = new Blob(
        [svg],
        {
            type: "image/svg+xml;charset=utf-8"
        }
    );

    const svgUrl =
        URL.createObjectURL(svgBlob);


    const img = new Image();

    await new Promise((resolve, reject) => {

        img.onload = resolve;
        img.onerror = reject;

        img.src = svgUrl;

    });


    // -------------------------------------------------
    // DRAW ON CANVAS
    // -------------------------------------------------

    const canvas =
        document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx =
        canvas.getContext("2d");

    ctx.drawImage(
        img,
        0,
        0,
        width,
        height
    );


    URL.revokeObjectURL(svgUrl);


    // -------------------------------------------------
    // CANVAS -> PNG BUFFER
    // -------------------------------------------------

    const pngBlob =
        await new Promise(resolve => {

            canvas.toBlob(
                resolve,
                "image/png"
            );

        });


    return await pngBlob.arrayBuffer();

};


// =====================================================
// CREATE HEADER
// =====================================================

const headerBuffer =
    await createHeaderImage(
        nlcLogoBuffer,
        sunLogoBuffer
    );


// =====================================================
// ADD HEADER IMAGE TO EXCEL
// =====================================================

const headerImageId =
    workbook.addImage({
        buffer: headerBuffer,
        extension: "png"
    });


// =====================================================
// INSERT HEADER IMAGE
// =====================================================

worksheet.addImage(
    headerImageId,
    {
        tl: {
            col: 0,
            row: 0
        },
        ext: {
            width: 1280,
            height: 108
        }
    }
);


// =====================================================
// REMOVE CELL VISUAL CONTENT
// =====================================================

for (let row = 1; row <= 2; row++) {

    for (let col = 1; col <= 12; col++) {

        const cell =
            worksheet.getCell(row, col);

        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "063B4D"
            }
        };

        cell.border = {};
    }
}


// =====================================================
// ROW 3 - WHITE GAP
// =====================================================

for (let col = 1; col <= 12; col++) {

    worksheet.getCell(3, col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFFF"
        }
    };
}


// =========================================================
// CENTER SEPARATOR
// =========================================================

worksheet.getCell("F1").border = {
    right: {
        style: "thin",
        color: {
            argb: "5F7D88"
        }
    }
};

worksheet.getCell("F2").border = {
    right: {
        style: "thin",
        color: {
            argb: "5F7D88"
        }
    }
};


// =========================================================
// HEADER BOTTOM LINE
// =========================================================

for (let col = 1; col <= 12; col++) {

    worksheet.getCell(2, col).border = {
        bottom: {
            style: "thin",
            color: {
                argb: "1B6074"
            }
        }
    };

}


// =========================================================
// WHITE GAP ROW
// =========================================================

for (let col = 1; col <= 12; col++) {

    const cell =
        worksheet.getCell(3, col);

    cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFFF"
        }
    };

}
        // =========================================================
        // TITLE ROW
        // =========================================================

       worksheet.mergeCells("A4:I4");

        const titleCell =
           worksheet.getCell("A4");

        titleCell.value =
            "NLCIL - Roof Top Solar – Performance Guarantee Test (PGT) - Library Building";

        titleCell.font = {
            name: "Calibri",
            size: 12,
            bold: true,
            color: {
                argb: BLACK
            }
        };

        titleCell.alignment = {
            horizontal: "center",
            vertical: "middle"
        };

        titleCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: YELLOW
            }
        };

        titleCell.border = thinBorder;

        // =========================================================
        // DATE LABEL
        // =========================================================

      // =========================================================
// REPORT DATE
// =========================================================

const dateLabel =
    worksheet.getCell("J4");

dateLabel.value = "Date:";

dateLabel.font = {
    name: "Calibri",
    size: 12,
    bold: true
};

dateLabel.alignment = {
    horizontal: "center",
    vertical: "middle"
};

dateLabel.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: YELLOW
    }
};

dateLabel.border = thinBorder;


// ---------------------------------------------------------
// REPORT DATE VALUE
// ---------------------------------------------------------

worksheet.mergeCells("K4:L4");

const reportDate =
    reportData[0]?.date
        ? formatDate(reportData[0].date)
        : formatDate(fromDate);

const dateCell =
    worksheet.getCell("K4");

dateCell.value = reportDate;

dateCell.font = {
    name: "Calibri",
    size: 12,
    bold: true
};

dateCell.alignment = {
    horizontal: "center",
    vertical: "middle"
};

dateCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: YELLOW
    }
};

dateCell.border = thinBorder;

       worksheet.getRow(4).height = 24;

        // =========================================================
        // HEADERS
        // =========================================================

        const headers = [

            "Sl. No",

            "Date",

            "Time",

            "GHI\n(W/m²)",

            "GII / POA\n(W/m²)",

            "Module\nTemp (°C)",

            "Inverter\nEnergy\n(kWh)",

            "Inverter Energy\nfor Interval\n(kWh)",

            "Net Meter Reading\n(kWh)",

            "Net Export Energy\nfor Interval\n(kWh)",

            "POA Irradiation\nfor Interval\n(Wh/m²)",

            "Remarks"

        ];

        headers.forEach((header, index) => {

            const cell =
               worksheet.getCell(
    5,
    index + 1
);

            cell.value = header;

            cell.font = {
                name: "Calibri",
                size: 11,
                bold: true,
                color: {
                    argb: WHITE
                }
            };

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: HEADER_BLUE
                }
            };

            cell.alignment = {
                horizontal: "center",
                vertical: "middle",
                wrapText: true
            };

            cell.border = thinBorder;

        });
        worksheet.getRow(5).height = 48;

      

        // =========================================================
        // DATA ROWS
        // =========================================================

        const dataStartRow = 6;

        reportData.forEach((row, index) => {

            const excelRow =
                dataStartRow + index;

            const current =
                worksheet.getRow(excelRow);

            // -----------------------------------------------------
            // SL NO
            // -----------------------------------------------------

            current.getCell(1).value =
                index + 1;

            // -----------------------------------------------------
            // DATE
            // IMPORTANT:
            // Keep as STRING to avoid timezone shifting
            // -----------------------------------------------------

            current.getCell(2).value =
                row.date
                    ? formatDate(row.date)
                    : "-";

            // -----------------------------------------------------
            // TIME
            // IMPORTANT:
            // Keep original API time as STRING
            // -----------------------------------------------------

            current.getCell(3).value =
                row.time || "-";

            // -----------------------------------------------------
            // GHI
            // -----------------------------------------------------

            current.getCell(4).value =
                row.ghi !== null &&
                row.ghi !== undefined
                    ? Number(row.ghi)
                    : "-";

            // -----------------------------------------------------
            // GII / POA
            // -----------------------------------------------------

            current.getCell(5).value =
                row.gii !== null &&
                row.gii !== undefined
                    ? Number(row.gii)
                    : "-";

            // -----------------------------------------------------
            // MODULE TEMP
            // -----------------------------------------------------

            current.getCell(6).value =
                row.moduleTemp !== null &&
                row.moduleTemp !== undefined
                    ? Number(row.moduleTemp)
                    : "-";

            // -----------------------------------------------------
            // INVERTER ENERGY
            // -----------------------------------------------------

            current.getCell(7).value =
                row.inverterEnergy !== null &&
                row.inverterEnergy !== undefined
                    ? Number(row.inverterEnergy)
                    : "-";

            // -----------------------------------------------------
            // INVERTER INTERVAL
            //
            // IMPORTANT:
            // Use backend calculated value.
            // DO NOT put Excel formula.
            // -----------------------------------------------------

            current.getCell(8).value =
                row.inverterEnergyInterval !== null &&
                row.inverterEnergyInterval !== undefined
                    ? Number(row.inverterEnergyInterval)
                    : "-";

            // -----------------------------------------------------
            // NET METER
            // -----------------------------------------------------

            current.getCell(9).value =
                row.netMeterReading !== null &&
                row.netMeterReading !== undefined
                    ? Number(row.netMeterReading)
                    : "-";

            // -----------------------------------------------------
            // NET EXPORT INTERVAL
            // -----------------------------------------------------

            current.getCell(10).value =
                row.netExportEnergyInterval !== null &&
                row.netExportEnergyInterval !== undefined
                    ? Number(row.netExportEnergyInterval)
                    : "-";

            // -----------------------------------------------------
            // POA IRRADIATION INTERVAL
            // -----------------------------------------------------

            current.getCell(11).value =
                row.poaIrradiationInterval !== null &&
                row.poaIrradiationInterval !== undefined
                    ? Number(row.poaIrradiationInterval)
                    : "-";

            // -----------------------------------------------------
            // REMARKS
            // -----------------------------------------------------

            current.getCell(12).value = "-";

            // -----------------------------------------------------
            // STYLE
            // -----------------------------------------------------

            for (let col = 1; col <= 12; col++) {

                const cell =
                    current.getCell(col);

                cell.font = {
                    name: "Calibri",
                    size: 11,
                    color: {
                        argb: BLACK
                    }
                };

                cell.alignment = {
                    horizontal: "center",
                    vertical: "middle",
                    wrapText: false
                };

                cell.border = thinBorder;

                // Alternate row
                if (index % 2 === 1) {

                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: LIGHT_GREY
                        }
                    };

                }

            }

            current.height = 22;

        });

        // =========================================================
        // TOTAL ROW
        // =========================================================

        const totalRow =
            dataStartRow + reportData.length;

        // Merge A:F for Total label
        worksheet.mergeCells(
            `A${totalRow}:F${totalRow}`
        );

        const totalLabel =
            worksheet.getCell(
                totalRow,
                1
            );

        totalLabel.value = "Total";

        totalLabel.font = {
            name: "Calibri",
            size: 12,
            bold: true
        };

        totalLabel.alignment = {
            horizontal: "center",
            vertical: "middle"
        };

        // H - Inverter Interval
        worksheet.getCell(
            totalRow,
            8
        ).value =
            totals.inverterEnergyInterval !== null &&
            totals.inverterEnergyInterval !== undefined
                ? Number(
                    totals.inverterEnergyInterval
                )
                : "-";

        // I - Net Meter
        worksheet.getCell(
            totalRow,
            9
        ).value = "-";

        // J - Net Export
        worksheet.getCell(
            totalRow,
            10
        ).value =
            totals.netExportEnergyInterval !== null &&
            totals.netExportEnergyInterval !== undefined
                ? Number(
                    totals.netExportEnergyInterval
                )
                : "-";

        // K - POA
        worksheet.getCell(
            totalRow,
            11
        ).value =
            totals.poaIrradiationInterval !== null &&
            totals.poaIrradiationInterval !== undefined
                ? Number(
                    totals.poaIrradiationInterval
                )
                : "-";

        // L
        worksheet.getCell(
            totalRow,
            12
        ).value = "-";

        // Style total row
        for (let col = 1; col <= 12; col++) {

            const cell =
                worksheet.getCell(
                    totalRow,
                    col
                );

            cell.font = {
                name: "Calibri",
                size: 12,
                bold: true
            };

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: YELLOW
                }
            };

            cell.border = thinBorder;

            cell.alignment = {
                horizontal: "center",
                vertical: "middle"
            };

        }

        worksheet.getRow(totalRow).height = 25;

        // =========================================================
        // CALCULATION SECTION
        // =========================================================

        const calcHeadingRow =
            totalRow + 2;

        const calcStartRow =
            calcHeadingRow + 1;

        // =========================================================
        // CALCULATION HEADING
        // =========================================================

    // =========================================================
// CALCULATION HEADING - FULL WIDTH G:L
// =========================================================

worksheet.mergeCells(
    `G${calcHeadingRow}:L${calcHeadingRow}`
);

const calcHeading =
    worksheet.getCell(
        calcHeadingRow,
        7
    );

calcHeading.value =
    "PG TEST CALCULATION - Library Building";

calcHeading.font = {
    name: "Calibri",
    size: 12,
    bold: true,
    color: {
        argb: "000000"
    }
};

calcHeading.alignment = {
    horizontal: "center",
    vertical: "middle"
};

calcHeading.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: LIGHT_GREEN
    }
};

calcHeading.border = thinBorder;

worksheet.getRow(
    calcHeadingRow
).height = 26;
        worksheet.getRow(
            calcHeadingRow
        ).height = 24;

        // =========================================================
        // CALCULATION VALUES
        // =========================================================

        const firstRow =
            reportData[0];

        const lastRow =
            reportData[
                reportData.length - 1
            ];
const installedCapacity = 50.85;

const totalPOA =
    totals.poaIrradiationInterval !== null &&
    totals.poaIrradiationInterval !== undefined
        ? Number(
            totals.poaIrradiationInterval
        ) / 1000
        : null;

// =========================================================
// NET METER NOT AVAILABLE
// Do NOT use Inverter Energy for PGT calculation
// =========================================================

const totalAC = null;

const finalYield = null;

const referenceYield =
    totalPOA !== null
        ? totalPOA
        : null;

const performanceRatio = null;

const guaranteedPR = 75;

const pgtResult = "-";
        // =========================================================
        // CALCULATION DATA
        // =========================================================

        const calculationRows = [

    [
        "Installed DC Capacity",
        "KWp",
        installedCapacity
    ],

    [
        "Test Start Date & Time",
        firstRow?.date
            ? formatDate(firstRow.date)
            : "-",
        firstRow?.time || "-"
    ],

    [
        "Test End Date & Time",
        lastRow?.date
            ? formatDate(lastRow.date)
            : "-",
        lastRow?.time || "-"
    ],

    [
        "Total POA Irradiation",
        "kWh/m²",
        totalPOA !== null
            ? Number(totalPOA.toFixed(2))
            : "-"
    ],

    [
        "Initial Net Meter Energy",
        "kWh",
        "-"
    ],

    [
        "Final Net Meter Energy",
        "kWh",
        "-"
    ],

    [
        "Total AC Energy Generated",
        "kWh",
        "-"
    ],

    [
        "Reference Yield",
        "h",
        referenceYield !== null
            ? Number(referenceYield.toFixed(2))
            : "-"
    ],

    [
        "Final Yield",
        "kWh/kWp",
        "-"
    ],

    [
        "Performance Ratio (PR)",
        "%",
        "-"
    ],

    [
        "Guaranteed PR",
        "%",
        guaranteedPR
    ],

    [
        "PGT Result",
        "",
        "-"
    ]

];
        // =========================================================
        // WRITE CALCULATION TABLE
        // =========================================================

        calculationRows.forEach(
            (item, index) => {

                const rowNo =
                    calcStartRow + index;

               // =====================================================
// CALCULATION TABLE - FULL WIDTH G:L
// =====================================================

// -----------------------------------------------------
// LABEL = G:I
// -----------------------------------------------------

worksheet.mergeCells(
    `G${rowNo}:I${rowNo}`
);

const labelCell =
    worksheet.getCell(
        rowNo,
        7
    );


// -----------------------------------------------------
// UNIT = J
// -----------------------------------------------------

const unitCell =
    worksheet.getCell(
        rowNo,
        10
    );


// -----------------------------------------------------
// VALUE = K:L
// -----------------------------------------------------

worksheet.mergeCells(
    `K${rowNo}:L${rowNo}`
);

const valueCell =
    worksheet.getCell(
        rowNo,
        11
    );
                labelCell.value =
                    item[0];

                unitCell.value =
                    item[1];

                valueCell.value =
                    item[2];

                // -------------------------------------------------
                // STYLE
                // -------------------------------------------------

                labelCell.font = {
                    name: "Calibri",
                    size: 10,
                    bold:
                        index === 0 ||
                        index === 9 ||
                        index === 11
                };

                unitCell.font = {
                    name: "Calibri",
                    size: 10,
                    bold:
                        index === 0 ||
                        index === 9 ||
                        index === 11
                };

                valueCell.font = {
                    name: "Calibri",
                    size: 10,
                    bold:
                        index === 0 ||
                        index === 9 ||
                        index === 11
                };

                labelCell.alignment = {
                    horizontal: "left",
                    vertical: "middle"
                };

                unitCell.alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                valueCell.alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                labelCell.border =
                    thinBorder;

                unitCell.border =
                    thinBorder;

                valueCell.border =
                    thinBorder;

                // -------------------------------------------------
                // PR ROW
                // -------------------------------------------------

                if (index === 9) {

                    labelCell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: LIGHT_GREEN
                        }
                    };

                    unitCell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: LIGHT_GREEN
                        }
                    };

                    valueCell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: LIGHT_GREEN
                        }
                    };

                }

                // -------------------------------------------------
                // PGT RESULT
                // -------------------------------------------------

                if (index === 11) {

                    labelCell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: LIGHT_GREEN
                        }
                    };

                    unitCell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: LIGHT_GREEN
                        }
                    };

                    valueCell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {
                            argb: LIGHT_GREEN
                        }
                    };

                    valueCell.font = {
                        name: "Calibri",
                        size: 11,
                        bold: true
                    };

                }

                worksheet.getRow(
                    rowNo
                ).height = 22;

            }
        );

        // =========================================================
        // ALIGNMENT FOR DATA TABLE
        // =========================================================

        for (
            let row = 6;
            row < totalRow;
            row++
        ) {

            for (
                let col = 1;
                col <= 12;
                col++
            ) {

                worksheet
                    .getCell(row, col)
                    .alignment = {
                        horizontal: "center",
                        vertical: "middle",
                        wrapText: false
                    };

            }

        }

        // =========================================================
        // FREEZE HEADER
        // =========================================================

        worksheet.views = [
            {
                state: "frozen",
                ySplit: 5
            }
        ];

        // =========================================================
        // PRINT SETTINGS
        // =========================================================

        const finalCalcRow =
            calcStartRow +
            calculationRows.length -
            1;

        worksheet.pageSetup = {

            orientation: "landscape",

            paperSize:
                worksheet.PAPERSIZE_A4,

            fitToPage: true,

            fitToWidth: 1,

            fitToHeight: 0,

            horizontalDpi: 300,

            verticalDpi: 300,

            margins: {
                left: 0.20,
                right: 0.20,
                top: 0.40,
                bottom: 0.40,
                header: 0.10,
                footer: 0.10
            }

        };

        // =========================================================
        // PRINT AREA
        // =========================================================

        worksheet.printArea =
            `A1:L${finalCalcRow}`;

        // =========================================================
        // FOOTER
        // =========================================================

        worksheet.headerFooter = {

            oddFooter: {

                center:
                    "Generated by SUN Industrial Automation & Solutions Pvt Ltd"

            }

        };

        // =========================================================
        // DOWNLOAD
        // =========================================================

        const buffer =
            await workbook.xlsx.writeBuffer();

        const blob =
            new Blob(
                [buffer],
                {
                    type:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
            );

        const url =
            window.URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `PGT_Report_Library_Building_${fromDate}.xlsx`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);

    }
    catch (error) {

        console.error(
            "PGT Excel Download Error:",
            error
        );

        console.error(
            "Error message:",
            error?.message
        );

        console.error(
            "Error stack:",
            error?.stack
        );

        alert(
            "Excel Error: " +
            (
                error?.message ||
                "Unknown error"
            )
        );

    }

};


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div className="wms-page">


            {/* =====================================================
                FIXED TOP HEADER
            ===================================================== */}

            <header className="wms-report-navbar">


                {/* LEFT */}

                <div className="wms-report-nav-left">

                    <div className="wms-report-logo-box">

                        <img
                            src={MainLogo}
                            alt="NLC Logo"
                        />

                    </div>


                    <div className="wms-report-title-box">

                        <h2>
                            NLC India Limited
                        </h2>

                        <span>
                            Solar Dashboard
                        </span>

                    </div>

                </div>


                {/* DIVIDER */}

                <div className="wms-report-divider"></div>


                {/* CENTER */}

                <div className="wms-report-nav-center">

                    <div className="wms-report-sun-box">

                        <img
                            src={SunLogo}
                            alt="SUN Logo"
                        />

                    </div>


                    <div className="wms-report-company">

                        <small>
                            EPC BY
                        </small>

                        <h4>
                            SUN Industrial Automation & Solutions Pvt Ltd
                        </h4>

                    </div>

                </div>


                {/* RIGHT */}

                <div className="wms-report-nav-right">

                    <div className="wms-report-live">

                        <span className="wms-report-dot"></span>

                        LIVE SYSTEM

                    </div>


                    <div className="wms-report-time">

                        Updated:{" "}

                        {new Date().toLocaleTimeString()}

                    </div>


                    <button
                        className="wms-report-back-btn"
                        onClick={() => navigate("/dashboard")}
                    >
                        ← ← Back
                    </button>

                </div>

            </header>



            {/* =====================================================
                PAGE CONTENT
            ===================================================== */}

            <div className="pgt-page-content">


                {/* =================================================
                    FILTER
                ================================================= */}

                <div className="pgt-filter-card">

                    <div className="pgt-filter-grid">


                        {/* FROM DATE */}

                        <div className="pgt-filter-item">

                            <label>
                                From Date
                            </label>

                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) =>
                                    setFromDate(e.target.value)
                                }
                            />

                        </div>


                        {/* TO DATE */}

                        <div className="pgt-filter-item">

                            <label>
                                To Date
                            </label>

                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) =>
                                    setToDate(e.target.value)
                                }
                            />

                        </div>


                       {/* FROM TIME */}

<div className="pgt-filter-item">

    <label>
        From Time
    </label>

    <input
        type="time"
        value={fromTime}
        onChange={(e) =>
            setFromTime(e.target.value)
        }
    />

</div>


{/* TO TIME */}

<div className="pgt-filter-item">

    <label>
        To Time
    </label>

    <input
        type="time"
        value={toTime}
        onChange={(e) =>
            setToTime(e.target.value)
        }
    />

</div>


                        {/* BUTTON */}

                        <div className="pgt-filter-item pgt-btn-box">

                            <button
                                className="pgt-generate-btn"
                                onClick={generateReport}
                                disabled={loading}
                            >

                                {loading
                                    ? "Generating..."
                                    : "📄 Generate Report"
                                }

                            </button>

                        </div>

                    </div>

                </div>



                {/* =================================================
                    REPORT
                ================================================= */}

                {reportData.length > 0 && (

                    <div className="pgt-report-preview">


                        {/* =================================================
                            REPORT TITLE
                        ================================================= */}

                       <div className="pgt-report-title">

    <h2>
        NLCIL - Roof Top Solar - Performance Guarantee Test (PGT) - Library Building
    </h2>

    <div className="pgt-title-actions">

    <span>
        Date: {formatDate(fromDate)}
    </span>

    <button
        className="pgt-excel-btn"
        onClick={downloadExcel}
    >
        📊 Download Excel
    </button>

</div>

</div>



                        {/* =================================================
                            TABLE
                        ================================================= */}

                        <div className="pgt-table-wrapper">

                            <table className="pgt-report-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Sl. No
                                        </th>

                                        <th>
                                            Date
                                        </th>

                                        <th>
                                            Time
                                        </th>

                                        <th>
                                            GHI
                                            <br />
                                            (W/m²)
                                        </th>

                                        <th>
                                            GII / POA
                                            <br />
                                            (W/m²)
                                        </th>

                                        <th>
                                            Module
                                            <br />
                                            Temp (°C)
                                        </th>

                                        <th>
                                            Inverter
                                            <br />
                                            Energy (kWh)
                                        </th>

                                        <th>
                                            Inverter Energy
                                            <br />
                                            for Interval (kWh)
                                        </th>

                                        <th>
                                            Net Meter
                                            <br />
                                            Reading (kWh)
                                        </th>

                                        <th>
                                            Net Export Energy
                                            <br />
                                            for Interval (kWh)
                                        </th>

                                        <th>
                                            POA Irradiation
                                            <br />
                                            for Interval (Wh/m²)
                                        </th>

                                        <th>
                                            Remarks
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {reportData.map(
                                        (row, index) => (

                                            <tr key={index}>


                                                {/* SL NO */}

                                                <td>
                                                    {index + 1}
                                                </td>


                                                {/* DATE */}

                                                <td>
                                                    {formatDate(row.date)}
                                                </td>


                                                {/* TIME */}

                                                <td>
                                                    {row.time || "-"}
                                                </td>


                                                {/* GHI */}

                                                <td>
                                                    {row.ghi !== null &&
                                                     row.ghi !== undefined
                                                        ? row.ghi
                                                        : "-"
                                                    }
                                                </td>


                                                {/* GII */}

                                                <td>
                                                    {row.gii !== null &&
                                                     row.gii !== undefined
                                                        ? row.gii
                                                        : "-"
                                                    }
                                                </td>


                                                {/* MODULE TEMP */}

                                                <td>
                                                    {row.moduleTemp !== null &&
                                                     row.moduleTemp !== undefined
                                                        ? row.moduleTemp
                                                        : "-"
                                                    }
                                                </td>


                                                {/* INVERTER ENERGY */}

                                                <td>
                                                    {row.inverterEnergy !== null &&
                                                     row.inverterEnergy !== undefined
                                                        ? row.inverterEnergy
                                                        : "-"
                                                    }
                                                </td>


                                                {/* INVERTER INTERVAL */}

                                                <td className="pgt-blue-cell">

                                                    {row.inverterEnergyInterval !== null &&
                                                     row.inverterEnergyInterval !== undefined
                                                        ? row.inverterEnergyInterval
                                                        : "-"
                                                    }

                                                </td>


                                                {/* NET METER */}

                                                <td className="pgt-blue-cell">

                                                    {row.netMeterReading !== null &&
                                                     row.netMeterReading !== undefined
                                                        ? row.netMeterReading
                                                        : "-"
                                                    }

                                                </td>


                                                {/* NET EXPORT */}

                                                <td className="pgt-blue-cell">

                                                    {row.netExportEnergyInterval !== null &&
                                                     row.netExportEnergyInterval !== undefined
                                                        ? row.netExportEnergyInterval
                                                        : "-"
                                                    }

                                                </td>


                                                {/* POA */}

                                                <td className="pgt-blue-cell">

                                                    {row.poaIrradiationInterval !== null &&
                                                     row.poaIrradiationInterval !== undefined
                                                        ? row.poaIrradiationInterval
                                                        : "-"
                                                    }

                                                </td>


                                                {/* REMARKS */}

                                                <td>
                                                    -
                                                </td>


                                            </tr>

                                        )
                                    )}


                                    {/* =================================================
                                        TOTAL
                                    ================================================= */}

                                    <tr className="pgt-total-row">

                                        <td
                                            colSpan="7"
                                        >
                                            Total
                                        </td>


                                        <td>

                                            {totals.inverterEnergyInterval !== null &&
                                             totals.inverterEnergyInterval !== undefined

                                                ? totals.inverterEnergyInterval

                                                : "-"

                                            }

                                        </td>


                                        <td>
                                            -
                                        </td>


                                        <td>

                                            {totals.netExportEnergyInterval !== null &&
                                             totals.netExportEnergyInterval !== undefined

                                                ? totals.netExportEnergyInterval

                                                : "-"

                                            }

                                        </td>


                                        <td>

                                            {totals.poaIrradiationInterval !== null &&
                                             totals.poaIrradiationInterval !== undefined

                                                ? totals.poaIrradiationInterval

                                                : "-"

                                            }

                                        </td>


                                        <td>
                                            -
                                        </td>

                                    </tr>

                                </tbody>

                            </table>

                        </div>



                        {/* =================================================
                            PG TEST CALCULATION
                        ================================================= */}

                        <div className="pgt-calculation-section">


                            <div className="pgt-calculation-heading">

                                PG TEST CALCULATION - Library Building

                            </div>


                            {/* Installed DC Capacity */}

                            <div className="pgt-calc-line">

                                <div>
                                    Installed DC Capacity
                                </div>

                                <div>
                                    kWp
                                </div>

                                <strong>
                                    50.85
                                </strong>

                            </div>


                            {/* Start */}

                            <div className="pgt-calc-line">

                                <div>
                                    Test Start Date & Time
                                </div>

                                <div>
                                    {formatDate(
                                        reportData[0]?.date
                                    )}
                                </div>

                                <strong>
                                    {reportData[0]?.time || "-"}
                                </strong>

                            </div>


                            {/* End */}

                            <div className="pgt-calc-line">

                                <div>
                                    Test End Date & Time
                                </div>

                                <div>
                                    {formatDate(
                                        reportData[
                                            reportData.length - 1
                                        ]?.date
                                    )}
                                </div>

                                <strong>
                                    {
                                        reportData[
                                            reportData.length - 1
                                        ]?.time || "-"
                                    }
                                </strong>

                            </div>


                            {/* Total POA */}

                            <div className="pgt-calc-line">

                                <div>
                                    Total POA Irradiation
                                </div>

                                <div>
                                    kWh/m²
                                </div>

                                <strong>

                                    {totals.poaIrradiationInterval !== null &&
                                     totals.poaIrradiationInterval !== undefined

                                        ? (
                                            Number(
                                                totals.poaIrradiationInterval
                                            ) / 1000
                                        ).toFixed(2)

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Initial Net Meter */}

                            <div className="pgt-calc-line">

                                <div>
                                    Initial Net Meter Energy
                                </div>

                                <div>
                                    kWh
                                </div>

                                <strong>

                                    {reportData[0]?.netMeterReading !== null &&
                                     reportData[0]?.netMeterReading !== undefined

                                        ? reportData[0].netMeterReading

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Final Net Meter */}

                            <div className="pgt-calc-line">

                                <div>
                                    Final Net Meter Energy
                                </div>

                                <div>
                                    kWh
                                </div>

                                <strong>

                                    {reportData[
                                        reportData.length - 1
                                    ]?.netMeterReading !== null &&
                                     reportData[
                                        reportData.length - 1
                                     ]?.netMeterReading !== undefined

                                        ? reportData[
                                            reportData.length - 1
                                          ].netMeterReading

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Total AC Energy */}

                            <div className="pgt-calc-line">

                                <div>
                                    Total AC Energy Generated
                                </div>

                                <div>
                                    kWh
                                </div>

                              <strong>-</strong>

                            </div>


                            {/* Reference Yield */}

                            <div className="pgt-calc-line">

                                <div>
                                    Reference Yield
                                </div>

                                <div>
                                    h
                                </div>

                                <strong>

                                    {totals.poaIrradiationInterval !== null &&
                                     totals.poaIrradiationInterval !== undefined

                                        ? (
                                            Number(
                                                totals.poaIrradiationInterval
                                            ) / 1000
                                        ).toFixed(2)

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Final Yield */}

                            <div className="pgt-calc-line">

                                <div>
                                    Final Yield
                                </div>

                                <div>
                                    kWh/kWp
                                </div>

                               <strong>-</strong>

                            </div>


                            {/* PR */}

                            <div className="pgt-calc-line pgt-pr-row">

                                <div>
                                    Performance Ratio (PR)
                                </div>

                                <div>
                                    %
                                </div>

                               <strong>-</strong>

                            </div>


                            {/* Guaranteed PR */}

                            <div className="pgt-calc-line">

                                <div>
                                    Guaranteed PR
                                </div>

                                <div>
                                    %
                                </div>

                                <strong>
                                    75.00%
                                </strong>

                            </div>


                            {/* RESULT */}

                            <div className="pgt-calc-line pgt-result-row">

                                <div>
                                    PGT Result
                                </div>

                                <div>
                                </div>

                               <strong>-</strong>

                            </div>

                        </div>

                    </div>

                )}

            </div>

        </div>

    );

}

export default PgtReport;