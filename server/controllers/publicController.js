const UserModel = require("../models/Users");
const axios = require('axios');
const BASE_URL = 'http://api.geonames.org';

const searchUsers = async(req, res) => {
    try{
      const query = req.query.query;
      if (!query) return res.json([]);

      const users = await UserModel.find({
          $or: [
              {username: { $regex: query, $options: "i" } },
              { name: { $regex: query, $options: "ix" }},
          ],
      }).limit(10).select("username name");

      res.json(users);

    } catch(err) {
        console.error(err);
        res.status(500).json({ message: "Server Search Failed"})
    }
};

const viewUser = async (req, res) => {
    try {
        const identifier = req.params.username;
        console.log("Looking up user with identifier:", identifier);
        
        // Check if the identifier is a valid MongoDB ObjectId
        const ObjectId = require('mongoose').Types.ObjectId;
        const isValidObjectId = ObjectId.isValid(identifier);
        
        // Build query based on whether identifier might be an ObjectId
        let query = { username: identifier };
        if (isValidObjectId) {
          query = { $or: [{ username: identifier }, { _id: identifier }] };
        }
        
        const user = await UserModel.findOne(query).select("-password -__v");
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        console.log("Found user:", user);
        res.json(user);
        
      } catch (err) {
        console.error("Error in viewUser:", err);
        res.status(500).json({ error: "Failed to get user object", details: err.message });
      }
  };

  async function getAdmin1Id({ cityId, username }) {
    if (!cityId) throw new Error('cityId is required');
    if (!username) throw new Error('GeoNames username is required');
  
    // Fetch the full hierarchy for the city
    const response = await axios.get(`${BASE_URL}/hierarchyJSON`, {
      params: { geonameId: cityId, username }
    });
  
    const nodes = response.data.geonames || [];
    // Find the admin1 entry (feature code 'ADM1')
    const adm1 = nodes.find(node => node.fcode === 'ADM1');
  
    if (!adm1) {
      throw new Error(`No ADM1 parent found for cityId ${cityId}`);
    }
  
    return adm1.geonameId;
  }


  const searchLocations = async (req, res) => {
    try {
      const rawQuery = req.query.query?.trim().toLowerCase();
      if (!rawQuery) return res.json([]);
  
      const response = await axios.get('https://secure.geonames.org/searchJSON', {
        params: {
          q: rawQuery,
          maxRows: 100,
          username: 'javabek',
          featureClass: ['A', 'P'],
          style: 'LONG',
          orderby: 'relevance',
        },
      });
  
      const formatLabel = async (location) => {
        if (location.fcl === 'L' || location.fcode === 'RGN') return null;
  
        const isCountry = location.fcode === 'PCLI';
        const isProvince = location.fcode.startsWith('ADM1');
  
        if (isCountry) {
          return {
            text: location.countryName,
            full: { value: location.countryId, label: location.countryName },
          };
        }
  
        const parts = [];
        const partsFull = [];
  
        parts.push(location.name);
        partsFull.push({ value: location.geonameId, label: location.name });
  
        if (location.adminName1 && !isProvince) {
          const admin1Id = await getAdmin1Id({ cityId: location.geonameId, username: "javabek" });
          //parts.push(location.adminName1);
          //console.log(admin1Id);
          partsFull.push({ value: admin1Id, label: location.adminName1 });
        }
  
        const countryAlreadyIncluded = parts.some((p) => p === location.countryName);
        if (!isCountry && !countryAlreadyIncluded) {
          //parts.push(location.countryName);
          partsFull.push({ value: location.countryId, label: location.countryName });
        }
  
        return {
          text: partsFull.map((loc) => loc.label).join(", "),
          full: partsFull,
        };
      };
  
      const locationsWithScore = response?.data.geonames.map((location) => {
        const isCountry = location.fcode === 'PCLI';
        const isStateProvince = location.fcode.startsWith('ADM1');
        const isCity = location.fcode.startsWith('PPL');
        const isCapital = location.fcode === 'PPLC';
  
        const exactMatch = location.name.toLowerCase() === rawQuery;
        const queryIsState = rawQuery.match(/(state|province|region)/i);
  
        let score = 0;
        score += isCountry ? 5000 : 0;
        score += isStateProvince ? 2000 : 0;
        score += isCapital ? 5000 : 0;
        score += isCity ? 3000 : 0;
        score += exactMatch ? 4000 : 0;
        score += (location.population / 10000) || 0;
        score += location.population > 1000000 ? 6000 : 0;
  
        score -= queryIsState && !isStateProvince ? 5000 : 0;
  
        if (location.name && location.countryName) {
          score -= (location.name.toLowerCase() === location.countryName.toLowerCase() && !isCountry) 
            ? 10000 
            : 0;
        }
  
        return {
          ...location,
          score,
          type: isCountry ? 'country' :
                isStateProvince ? 'province' :
                isCity ? 'city' : 'other',
        };
      });
  
      // First sort by score
      const sortedLocations = locationsWithScore.sort((a, b) => b.score - a.score);
  
      // Now map **async** to formatLabel
      const mappedWithLabels = await Promise.all(
        sortedLocations.map(async (location) => {
          const label = await formatLabel(location);
          return {
            id: location.geonameId,
            label,
            type: location.type,
            original: location,
          };
        })
      );
  
      // Filter and clean results
      const filtered = mappedWithLabels
        .filter(item => item.label)
        .filter(item => item.label.text.toLowerCase().includes(rawQuery))
        .reduce((acc, current) => {
          const exists = acc.some(item => item.label.text === current.label.text);
          if (!exists) acc.push(current);
          return acc;
        }, [])
        .slice(0, 7);
  
      res.json(filtered);
    } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({ message: "Location search failed", error: err.message });
    }
  };
  

  const getFilteredHosts = async (req, res) => {
    try {
      // 1. We now expect full Option objects from the client:
      const { country, province, city, languages, type } = req.body;
  
      // 2. Base filter: only hosts who are 'open'
      const query = { open: 'Yes' };
  
      // 3. Conditionally add each filter by its .value
      if (country && country.value)  query['country.value']  = country.value;
      if (province && province.value) query['province.value'] = province.value;
      if (city && city.value)     query['city.value']     = city.value;
  
      // 4. Languages: incoming array of Option objects → match any value
      if (Array.isArray(languages) && languages.length > 0) {
        const vals = languages.map(l => l.value);
        query['languages.value'] = { $in: vals };
      }
  
      // 5. Host type (Volunteer / Paid)
      if (type) {
        query.type = type;
      }
  
      // 6. Run the query, excluding sensitive fields
      const hosts = await UserModel
        .find(query)
        .select('-password -__v');
  
      // 7. Send back matching hosts
      return res.json(hosts);
    } catch (err) {
      return res.status(500).json({
        error:   "Failed to get hosts",
        details: err.message
      });
    }
  };
  


module.exports = { searchUsers, viewUser, searchLocations, getFilteredHosts }