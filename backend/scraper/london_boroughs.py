"""Configuration catalogue of all 33 London local authorities.

Each entry contains:
- name: Borough name
- la_code: DfE local authority code (used in GIAS data)
- url: Link to the admissions outcomes / last distance offered page
- format: Primary data format (pdf, html, excel)
- lat, lng: Approximate borough center for geographic filtering
"""

BOROUGHS = [
    {
        "name": "Barking and Dagenham",
        "la_code": "301",
        "url": "https://www.lbbd.gov.uk/schools-and-education/school-admissions/primary-school-admissions",
        "format": "pdf",
    },
    {
        "name": "Barnet",
        "la_code": "302",
        "url": "https://www.barnet.gov.uk/schools-and-education/school-admissions/admissions-criteria-and-last-distance-offered",
        "format": "pdf",
    },
    {
        "name": "Bexley",
        "la_code": "303",
        "url": "https://www.bexley.gov.uk/services/schools-and-education/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Brent",
        "la_code": "304",
        "url": "https://www.brent.gov.uk/children-young-people-and-families/schools-and-colleges/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Bromley",
        "la_code": "305",
        "url": "https://www.bromley.gov.uk/downloads/download/457/school-admissions-report",
        "format": "pdf",
        "lat": 51.366,
        "lng": 0.045,
    },
    {
        "name": "Camden",
        "la_code": "202",
        "url": "https://www.camden.gov.uk/school-admissions",
        "format": "pdf",
    },
    {
        "name": "City of London",
        "la_code": "201",
        "url": "https://www.cityoflondon.gov.uk/services/education-and-learning",
        "format": "pdf",
    },
    {
        "name": "Croydon",
        "la_code": "306",
        "url": "https://www.croydon.gov.uk/schools-and-education/schools/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Ealing",
        "la_code": "307",
        "url": "https://www.ealing.gov.uk/info/201083/school_admissions",
        "format": "pdf",
    },
    {
        "name": "Enfield",
        "la_code": "308",
        "url": "https://www.enfield.gov.uk/services/children-and-education/school-admissions-and-applications",
        "format": "pdf",
    },
    {
        "name": "Greenwich",
        "la_code": "203",
        "url": "https://www.royalgreenwich.gov.uk/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Hackney",
        "la_code": "204",
        "url": "https://education.hackney.gov.uk/content/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Hammersmith and Fulham",
        "la_code": "205",
        "url": "https://www.lbhf.gov.uk/children-and-young-people/schools-and-colleges/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Haringey",
        "la_code": "309",
        "url": "https://www.haringey.gov.uk/children-and-families/schools-and-education/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Harrow",
        "la_code": "310",
        "url": "https://www.harrow.gov.uk/schools-learning/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Havering",
        "la_code": "311",
        "url": "https://www.havering.gov.uk/info/20007/schools_and_education/113/school_admissions",
        "format": "pdf",
    },
    {
        "name": "Hillingdon",
        "la_code": "312",
        "url": "https://www.hillingdon.gov.uk/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Hounslow",
        "la_code": "313",
        "url": "https://www.hounslow.gov.uk/info/20029/school_admissions",
        "format": "pdf",
    },
    {
        "name": "Islington",
        "la_code": "206",
        "url": "https://www.islington.gov.uk/children-and-families/schools/apply-for-a-school-place",
        "format": "pdf",
    },
    {
        "name": "Kensington and Chelsea",
        "la_code": "207",
        "url": "https://www.rbkc.gov.uk/schools-and-education/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Kingston upon Thames",
        "la_code": "314",
        "url": "https://www.kingston.gov.uk/schools/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Lambeth",
        "la_code": "208",
        "url": "https://www.lambeth.gov.uk/children-young-people-and-families/schools/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Lewisham",
        "la_code": "209",
        "url": "https://lewisham.gov.uk/myservices/education/schools/school-admission",
        "format": "pdf",
    },
    {
        "name": "Merton",
        "la_code": "315",
        "url": "https://www.merton.gov.uk/schools-and-education/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Newham",
        "la_code": "316",
        "url": "https://www.newham.gov.uk/schools-education/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Redbridge",
        "la_code": "317",
        "url": "https://www.redbridge.gov.uk/schools/school-admissions/",
        "format": "pdf",
    },
    {
        "name": "Richmond upon Thames",
        "la_code": "318",
        "url": "https://www.richmond.gov.uk/services/schools_and_education/school_admissions",
        "format": "pdf",
    },
    {
        "name": "Southwark",
        "la_code": "210",
        "url": "https://www.southwark.gov.uk/schools-and-education/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Sutton",
        "la_code": "319",
        "url": "https://www.sutton.gov.uk/w/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Tower Hamlets",
        "la_code": "211",
        "url": "https://www.towerhamlets.gov.uk/lgnl/education_and_learning/schools/school_admissions/school_admissions.aspx",
        "format": "pdf",
    },
    {
        "name": "Waltham Forest",
        "la_code": "320",
        "url": "https://www.walthamforest.gov.uk/schools-and-learning/school-admissions",
        "format": "pdf",
    },
    {
        "name": "Wandsworth",
        "la_code": "212",
        "url": "https://www.wandsworth.gov.uk/schools-and-admissions/school-admissions/",
        "format": "pdf",
    },
    {
        "name": "Westminster",
        "la_code": "213",
        "url": "https://www.westminster.gov.uk/children-and-education/schools-and-colleges/school-admissions",
        "format": "pdf",
    },
]


def get_borough_by_la_code(la_code: str) -> dict | None:
    """Look up a borough config by LA code."""
    for b in BOROUGHS:
        if b["la_code"] == la_code:
            return b
    return None
